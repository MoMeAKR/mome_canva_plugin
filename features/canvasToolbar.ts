import { Plugin, setIcon, Platform, Modal, App } from "obsidian";
import { IMomePlugin } from "../types";

export interface ToolbarButton {
    icon: string;
    tooltip: string;
    command?: string;
    // CHANGE 1: Update signature to accept the event
    callback?: (evt: MouseEvent) => void;
    submenu?: ToolbarButton[];
    submenuDirection?: 'vertical' | 'horizontal';
}

/**
 * A Mobile-friendly modal to display submenu items
 */
class ToolbarMenuModal extends Modal {
    private items: ToolbarButton[];
    private plugin: Plugin;
    private parentToolbar: CanvasToolbar;

    constructor(app: App, plugin: Plugin, parentToolbar: CanvasToolbar, items: ToolbarButton[]) {
        super(app);
        this.plugin = plugin;
        this.parentToolbar = parentToolbar;
        this.items = items;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Select Action" });

        const container = contentEl.createDiv();
        container.style.display = "flex";
        container.style.flexDirection = "column";

        this.items.forEach((item) => {
            const itemDiv = container.createDiv({ cls: "mome-mobile-menu-item" });
            
            // Icon
            const iconDiv = itemDiv.createDiv({ cls: "mome-mobile-menu-icon" });
            setIcon(iconDiv, item.icon);

            // Label (Tooltip)
            itemDiv.createDiv({ text: item.tooltip, cls: "mome-mobile-menu-label" });

            // CHANGE 2: Pass the click event in the mobile modal too
            itemDiv.onclick = (e: MouseEvent) => {
                this.close(); 
                
                if (item.callback) {
                    item.callback(e); // Pass event
                } else if (item.command) {
                    (this.parentToolbar as any).executeCommand(item.command);
                }
            };
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class CanvasToolbar {
    private plugin: Plugin & IMomePlugin;
    private toolbarElement: HTMLElement | null = null;
    private currentCanvas: any = null;
    private selectionHandler: (() => void) | null = null;

    private selectionPollingInterval: number | null = null;
    private positionUpdateInterval: number | null = null;
    private buttons: ToolbarButton[];
    private enabled: boolean = true;

    private activeSubmenu: { container: HTMLElement; anchor: HTMLElement } | null = null;
    private outsideClickHandler: ((ev: Event) => void) | null = null;

    constructor(plugin: Plugin & IMomePlugin, buttons: ToolbarButton[]) {
        this.plugin = plugin;
        this.buttons = buttons;
    }

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

    private setupCanvas(leaf: any) {
        this.cleanup();

        if (leaf?.view?.canvas) {
            this.currentCanvas = leaf.view.canvas;
            this.selectionHandler = () => this.handleSelectionChange();
            this.startSelectionPolling();
            this.handleSelectionChange();
        }
    }

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

    private consumePointerEarly(el: HTMLElement) {
        const stop = (e: Event) => {
            e.stopPropagation();
        };
        el.addEventListener('pointerdown', stop);
    }

    private createToolbar(node: any) {
        const toolbar = document.createElement('div');
        toolbar.className = 'mome-canvas-toolbar';
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

    private createButton(config: ToolbarButton): HTMLElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mome-toolbar-button clickable-icon';
        button.setAttribute('aria-label', config.tooltip);
        setIcon(button, config.icon);

        this.consumePointerEarly(button);

        if (config.submenu && config.submenu.length) {
            button.classList.add('has-submenu');
            
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (Platform.isMobile) {
                    new ToolbarMenuModal(this.plugin.app, this.plugin, this, config.submenu!).open();
                } else {
                    if (this.activeSubmenu && this.activeSubmenu.anchor === button) {
                        this.closeSubmenu();
                    } else {
                        this.openSubmenu(button, config.submenu!);
                    }
                }
            };
        } else {
            // CHANGE 3: Capture 'e' (MouseEvent) and pass it
            button.onclick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (config.callback) {
                    config.callback(e); // Pass it here!
                } else if (config.command) {
                    this.executeCommand(config.command);
                }
                this.closeSubmenu();
            };
        }
        return button;
    }

    public executeCommand(commandId: string) {
        const app = this.plugin.app as any;
        if (app.commands.executeCommandById(commandId)) return;
        const fullId = `${this.plugin.manifest.id}:${commandId}`;
        if (app.commands.executeCommandById(fullId)) return;
        console.warn(`Command not found: ${commandId}`);
    }

    private createLeafButton(config: ToolbarButton): HTMLElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mome-toolbar-button clickable-icon mome-submenu-item';
        btn.setAttribute('aria-label', config.tooltip);
        
        setIcon(btn, config.icon);

        // Add text label
        const label = document.createElement("span");
        label.innerText = config.tooltip;
        label.className = "mome-submenu-label";
        btn.appendChild(label);

        this.consumePointerEarly(btn);

        // CHANGE 4: Capture 'e' (MouseEvent) and pass it
        btn.onclick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (config.callback) {
                config.callback(e); // Pass it here!
            } else if (config.command) {
                this.executeCommand(config.command);
            }
            this.closeSubmenu();
        };

        return btn;
    }

    // ... (rest of the file: pickSubmenuOrientation, openSubmenu, closeSubmenu, positionSubmenu, etc. remain unchanged)
    
    private pickSubmenuOrientation(anchor: HTMLElement): 'vertical' | 'horizontal' {
        return 'vertical'; // Forcing vertical as requested
    }

    private openSubmenu(anchor: HTMLElement, items: ToolbarButton[]) {
        this.closeSubmenu();

        const submenu = document.createElement('div');
        submenu.className = 'mome-toolbar-submenu';

        const anchorBtnDirection = (this.buttons.find(b => b.submenu && b.submenu === items)?.submenuDirection) ?? undefined;
        const orientation = anchorBtnDirection ?? this.pickSubmenuOrientation(anchor);
        submenu.classList.add(orientation);

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

        const isHorizontal = submenu.classList.contains('horizontal');
        const anchorCenterX = anchorRect.left - toolbarRect.left + (anchorRect.width / 2);

        const margin = 6;
        const availableBelow = Math.max(0, wrapperRect.bottom - toolbarRect.bottom - margin);
        const availableAbove = Math.max(0, toolbarRect.top - wrapperRect.top - margin);

        let left = anchorCenterX;
        let top = this.toolbarElement.offsetHeight + margin;

        if (isHorizontal) {
            const maxWidth = Math.min(300, wrapperRect.width - 12);
            submenu.style.width = `${maxWidth}px`;
            
            submenu.style.left = '0px';
            submenu.style.top = '0px';
            submenu.style.visibility = 'hidden';
            submenu.style.position = 'absolute';
            submenu.style.transform = 'translateX(-50%)';
            
            const submenuRect = submenu.getBoundingClientRect();
            
            const desiredLeftOnPage = toolbarRect.left + left - submenuRect.width / 2;
            const minLeftOnPage = wrapperRect.left + 4;
            const maxLeftOnPage = wrapperRect.right - submenuRect.width - 4;
            const clampedLeftOnPage = Math.max(minLeftOnPage, Math.min(maxLeftOnPage, desiredLeftOnPage));
            left = clampedLeftOnPage - toolbarRect.left + submenuRect.width / 2;

            if (availableBelow < 60 && availableAbove > availableBelow) {
                top = -submenuRect.height - margin;
            }
        } else {
            submenu.style.width = '160px';
            const maxHeight = Math.max(150, Math.min(300, Math.max(availableBelow, availableAbove) - 20));
            submenu.style.maxHeight = `${maxHeight}px`;

            submenu.style.left = '0px';
            submenu.style.top = '0px';
            submenu.style.visibility = 'hidden';
            submenu.style.position = 'absolute';
            submenu.style.transform = 'translateX(-50%)';
            
            const submenuRect = submenu.getBoundingClientRect();
            
            const desiredLeftOnPage = toolbarRect.left + left - submenuRect.width / 2;
            const minLeftOnPage = wrapperRect.left + 4;
            const maxLeftOnPage = wrapperRect.right - submenuRect.width - 4;
            const clampedLeftOnPage = Math.max(minLeftOnPage, Math.min(maxLeftOnPage, desiredLeftOnPage));
            left = clampedLeftOnPage - toolbarRect.left + submenuRect.width / 2;

            const desiredBottomOnPage = toolbarRect.bottom + top + maxHeight;
            if (desiredBottomOnPage > wrapperRect.bottom - 4 && availableAbove > availableBelow) {
                top = -maxHeight - margin;
            }
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
        document.addEventListener('pointerdown', this.outsideClickHandler as any, { capture: true });
    }

    private positionToolbar(toolbar: HTMLElement, node: any) {
        const nodeRect = node.nodeEl.getBoundingClientRect();
        const canvasRect = this.currentCanvas.wrapperEl.getBoundingClientRect();

        const left = nodeRect.left - canvasRect.left + (nodeRect.width / 2);
        const top = nodeRect.bottom - canvasRect.top + 8;

        toolbar.style.left = `${left}px`;
        toolbar.style.top = `${top}px`;
        toolbar.style.transform = 'translateX(-50%)';
    }

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

    private removeToolbar() {
        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }
        this.closeSubmenu();
    }

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