import { Plugin, setIcon } from "obsidian";
import { IMomePlugin } from "../types";

// Allow 'callback' OR 'command' and optional submenu
export interface ToolbarButton {
    icon: string;
    tooltip: string;
    command?: string;
    callback?: () => void;
    submenu?: ToolbarButton[];
}

export class CanvasToolbar {
    private plugin: Plugin & IMomePlugin;
    private toolbarElement: HTMLElement | null = null;
    private currentCanvas: any = null;
    private selectionHandler: (() => void) | null = null;

    // Properties
    private selectionPollingInterval: number | null = null;
    private positionUpdateInterval: number | null = null;
    private buttons: ToolbarButton[];
    private enabled: boolean = true;

    // Tracking submenus
    private activeSubmenu: { container: HTMLElement; anchor: HTMLElement } | null = null;
    private outsideClickHandler: ((ev: Event) => void) | null = null;

    constructor(plugin: Plugin & IMomePlugin, buttons: ToolbarButton[]) {
        this.plugin = plugin;
        this.buttons = buttons;
    }

    /**
     * Initialize the canvas toolbar system
     */
    initialize() {
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
                this.setupCanvas(leaf);
            })
        );

        const activeLeaf = this.plugin.app.workspace.activeLeaf;
        if (activeLeaf) {
            this.setupCanvas(activeLeaf);
        }
    }

    /**
     * Setup toolbar for a specific canvas leaf
     */
    private setupCanvas(leaf: any) {
        this.cleanup();

        if (leaf?.view?.canvas) {
            this.currentCanvas = leaf.view.canvas;
            this.selectionHandler = () => this.handleSelectionChange();
            this.startSelectionPolling();
            this.handleSelectionChange();
        }
    }

    /**
     * Start polling for selection changes
     */
    private startSelectionPolling() {
        this.stopSelectionPolling();

        let lastSelectionSize = 0;
        let lastSelectedNode: any = null;

        this.selectionPollingInterval = window.setInterval(() => {
            if (!this.currentCanvas) return;

            const selection = this.currentCanvas.selection;
            const currentSize = selection ? selection.size : 0;
            const currentNode = currentSize === 1 ? Array.from(selection)[0] : null;

            if (currentSize !== lastSelectionSize || currentNode !== lastSelectedNode) {
                lastSelectionSize = currentSize;
                lastSelectedNode = currentNode;
                this.handleSelectionChange();
            }
        }, 100);
    }

    private stopSelectionPolling() {
        if (this.selectionPollingInterval !== null) {
            window.clearInterval(this.selectionPollingInterval);
            this.selectionPollingInterval = null;
        }
    }

    /**
     * Handle canvas selection changes
     */
    private handleSelectionChange() {
        this.removeToolbar();
        this.closeSubmenu();

        if (!this.enabled) return;
        if (!this.currentCanvas) return;

        const selection = this.currentCanvas.selection;

        if (selection && selection.size === 1) {
            const node = Array.from(selection)[0];
            if (node?.nodeEl) {
                this.createToolbar(node);
            }
        }
    }

    /**
     * Create and display the toolbar below the selected node
     */
    private createToolbar(node: any) {
        const toolbar = document.createElement('div');
        toolbar.className = 'mome-canvas-toolbar';

        // Prevent pointerdown from bubbling to canvas when tapping gaps between buttons
        this.consumePointerEarly(toolbar);

        this.buttons.forEach(btn => {
            const button = this.createButton(btn);
            toolbar.appendChild(button);
        });

        this.positionToolbar(toolbar, node);
        this.currentCanvas.wrapperEl.appendChild(toolbar);
        this.toolbarElement = toolbar;

        this.setupPositionUpdates(toolbar, node);
    }

    /**
     * Stop the canvas from seeing the initial pointer/touch down on controls.
     * We only stop propagation (no preventDefault) to preserve click generation.
     */
    private consumePointerEarly(el: HTMLElement) {
        const stop = (e: Event) => {
            e.stopPropagation();
        };
        el.addEventListener('pointerdown', stop, { capture: true });
        el.addEventListener('touchstart', stop, { capture: true });
    }

    private createButton(config: ToolbarButton): HTMLElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mome-toolbar-button clickable-icon';
        button.setAttribute('aria-label', config.tooltip);
        setIcon(button, config.icon);

        // Block pointerdown from reaching the canvas
        this.consumePointerEarly(button);

        if (config.submenu && config.submenu.length) {
            button.classList.add('has-submenu');
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.activeSubmenu && this.activeSubmenu.anchor === button) {
                    this.closeSubmenu();
                } else {
                    this.openSubmenu(button, config.submenu!);
                }
            };
        } else {
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (config.callback) {
                    config.callback();
                } else if (config.command) {
                    this.executeCommand(config.command);
                }
                this.closeSubmenu();
            };
        }
        return button;
    }

    private createLeafButton(config: ToolbarButton): HTMLElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mome-toolbar-button clickable-icon';
        btn.setAttribute('aria-label', config.tooltip);
        setIcon(btn, config.icon);

        // Block pointerdown from reaching the canvas
        this.consumePointerEarly(btn);

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (config.callback) {
                config.callback();
            } else if (config.command) {
                this.executeCommand(config.command);
            }
            this.closeSubmenu();
        };

        return btn;
    }

    private openSubmenu(anchor: HTMLElement, items: ToolbarButton[]) {
        this.closeSubmenu();

        const submenu = document.createElement('div');
        submenu.className = 'mome-toolbar-submenu';

        // Prevent pointerdown in submenu from reaching the canvas
        this.consumePointerEarly(submenu);

        items.forEach(item => {
            const subBtn = this.createLeafButton(item);
            submenu.appendChild(subBtn);
        });

        if (this.toolbarElement) {
            this.toolbarElement.appendChild(submenu);
        }
        this.activeSubmenu = { container: submenu, anchor };
        this.positionSubmenu(submenu, anchor);
        this.attachOutsideClickHandler();
    }

    private closeSubmenu() {
        if (this.activeSubmenu) {
            this.activeSubmenu.container.remove();
            this.activeSubmenu = null;
        }
        if (this.outsideClickHandler) {
            document.removeEventListener('pointerdown', this.outsideClickHandler as any, true);
            this.outsideClickHandler = null;
        }
    }

    private positionSubmenu(submenu: HTMLElement, anchor: HTMLElement) {
        if (!this.toolbarElement || !this.currentCanvas) return;

        const toolbarRect = this.toolbarElement.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const wrapperRect = this.currentCanvas.wrapperEl.getBoundingClientRect();

        // Compute anchor x relative to toolbar
        const anchorCenterX = anchorRect.left - toolbarRect.left + (anchorRect.width / 2);

        // Temporarily set to bottom; measure and clamp
        submenu.style.left = '0px';
        submenu.style.top = '0px';
        submenu.style.visibility = 'hidden';
        submenu.style.position = 'absolute';
        submenu.style.transform = 'translateX(-50%)';

        // Force layout
        const submenuRect = submenu.getBoundingClientRect();

        // Desired left: center under anchor
        let left = anchorCenterX;
        // Desired top: below toolbar
        let top = this.toolbarElement.offsetHeight + 6;

        // Clamp submenu within canvas wrapper horizontally
        const desiredLeftOnPage = toolbarRect.left + left - submenuRect.width / 2;
        const minLeftOnPage = wrapperRect.left + 4;
        const maxLeftOnPage = wrapperRect.right - submenuRect.width - 4;

        const clampedLeftOnPage = Math.max(minLeftOnPage, Math.min(maxLeftOnPage, desiredLeftOnPage));
        left = clampedLeftOnPage - toolbarRect.left + submenuRect.width / 2;

        // If submenu would overflow bottom of wrapper, place above the toolbar
        const desiredBottomOnPage = toolbarRect.bottom + top + submenuRect.height;
        if (desiredBottomOnPage > wrapperRect.bottom - 4) {
            top = -submenuRect.height - 6; // show above
        }

        submenu.style.left = `${left}px`;
        submenu.style.top = `${top}px`;
        submenu.style.visibility = 'visible';
    }

    private attachOutsideClickHandler() {
        if (this.outsideClickHandler) return;
        this.outsideClickHandler = (ev: Event) => {
            const target = ev.target as Node;
            const isInsideSubmenu = this.activeSubmenu?.container.contains(target) ?? false;
            const isAnchor = this.activeSubmenu?.anchor.contains(target) ?? false;
            if (!isInsideSubmenu && !isAnchor) {
                this.closeSubmenu();
            }
        };
        // Use pointerdown with capture so we detect outside taps before the canvas handles them
        document.addEventListener('pointerdown', this.outsideClickHandler as any, { capture: true });
    }

    /**
     * Execute a registered command
     */
    private executeCommand(commandId: string) {
        const app = this.plugin.app as any;

        // Try exact match first
        if (app.commands.executeCommandById(commandId)) return;

        // Try prepending plugin ID if not found
        const fullId = `${this.plugin.manifest.id}:${commandId}`;
        if (app.commands.executeCommandById(fullId)) return;

        console.warn(`Command not found: ${commandId}`);
    }

    /**
     * Position the toolbar below the selected node
     */
    private positionToolbar(toolbar: HTMLElement, node: any) {
        const nodeRect = node.nodeEl.getBoundingClientRect();
        const canvasRect = this.currentCanvas.wrapperEl.getBoundingClientRect();

        const left = nodeRect.left - canvasRect.left + (nodeRect.width / 2);
        const top = nodeRect.bottom - canvasRect.top + 8;

        toolbar.style.left = `${left}px`;
        toolbar.style.top = `${top}px`;
        toolbar.style.transform = 'translateX(-50%)';
    }

    /**
     * Setup listeners to update toolbar position
     */
    private setupPositionUpdates(toolbar: HTMLElement, node: any) {
        if (this.positionUpdateInterval !== null) {
            window.clearInterval(this.positionUpdateInterval);
        }
        this.positionUpdateInterval = window.setInterval(() => {
            if (this.toolbarElement && node?.nodeEl) {
                this.positionToolbar(toolbar, node);
                if (this.activeSubmenu) {
                    this.positionSubmenu(this.activeSubmenu.container, this.activeSubmenu.anchor);
                }
            }
        }, 50);
    }

    /**
     * Remove the toolbar from DOM
     */
    private removeToolbar() {
        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }
        this.closeSubmenu();
    }

    /**
     * Clean up all toolbar resources
     */
    cleanup() {
        this.removeToolbar();
        this.stopSelectionPolling();
        if (this.positionUpdateInterval !== null) {
            window.clearInterval(this.positionUpdateInterval);
            this.positionUpdateInterval = null;
        }
        this.currentCanvas = null;
        this.selectionHandler = null;
    }

    destroy() {
        this.cleanup();
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.removeToolbar();
        } else {
            this.handleSelectionChange();
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.handleSelectionChange();
        }
    }

    disable() {
        if (this.enabled) {
            this.enabled = false;
            this.removeToolbar();
        }
    }
}
