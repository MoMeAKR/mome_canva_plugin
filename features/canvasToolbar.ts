// features/canvas-toolbar.ts
import { Plugin, setIcon } from "obsidian";
import { IMomePlugin } from "../types";

interface ToolbarButton {
    icon: string;
    tooltip: string;
    command: string; // Command ID to execute
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

    constructor(plugin: Plugin & IMomePlugin, buttons: ToolbarButton[]) {
        this.plugin = plugin;
        this.buttons = buttons;
    }

    /**
     * Initialize the canvas toolbar system
     */
    initialize() {
        // Listen for active leaf changes to detect canvas views
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
                this.setupCanvas(leaf);
            })
        );

        // Setup toolbar for currently active canvas (if any)
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

        // Check if the leaf contains a canvas view
        if (leaf?.view?.canvas) {
            this.currentCanvas = leaf.view.canvas;

            // Create selection handler
            this.selectionHandler = () => this.handleSelectionChange();

            // Poll for selection changes (canvas doesn't have proper event emitters)
            this.startSelectionPolling();

            // Initial toolbar update
            this.handleSelectionChange();
        }
    }

    /**
     * Start polling for selection changes
     */
    private selectionPollingInterval: number | null = null;
    
    private startSelectionPolling() {
        // Clear any existing interval
        this.stopSelectionPolling();
        
        let lastSelectionSize = 0;
        let lastSelectedNode: any = null;
        
        this.selectionPollingInterval = window.setInterval(() => {
            if (!this.currentCanvas) return;
            
            const selection = this.currentCanvas.selection;
            const currentSize = selection ? selection.size : 0;
            const currentNode = currentSize === 1 ? Array.from(selection)[0] : null;
            
            // Check if selection changed
            if (currentSize !== lastSelectionSize || currentNode !== lastSelectedNode) {
                lastSelectionSize = currentSize;
                lastSelectedNode = currentNode;
                this.handleSelectionChange();
            }
        }, 100); // Check every 100ms
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

        // Don't show toolbar if disabled
        if (!this.enabled) return;

        if (!this.currentCanvas) return;

        const selection = this.currentCanvas.selection;

        // Only show toolbar when exactly one node is selected
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

        // Create button elements from configured buttons
        this.buttons.forEach(btn => {
            const button = this.createButton(btn);
            toolbar.appendChild(button);
        });

        // Position the toolbar below the node
        this.positionToolbar(toolbar, node);

        // Add to canvas
        this.currentCanvas.wrapperEl.appendChild(toolbar);
        this.toolbarElement = toolbar;

        // Update position on canvas pan/zoom
        this.setupPositionUpdates(toolbar, node);
    }

    /**
     * Create a single toolbar button
     */
    private createButton(config: ToolbarButton): HTMLElement {
        const button = document.createElement('button');
        button.className = 'mome-toolbar-button clickable-icon';
        button.setAttribute('aria-label', config.tooltip);

        // Add icon using Obsidian's setIcon
        setIcon(button, config.icon);

        // Execute command on click
        button.onclick = (e) => {
            e.stopPropagation();
            this.executeCommand(config.command);
        };

        return button;
    }

    /**
     * Execute a registered command
     */
    private executeCommand(commandId: string) {
        const commands = (this.plugin.app as any).commands;
        const command = commands.commands[commandId];

        if (command) {
            commands.executeCommandById(commandId);
        } else {
            console.warn(`Command not found: ${commandId}`);
        }
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
        toolbar.style.transform = 'translateX(-50%)'; // Center horizontally
    }

    /**
     * Setup listeners to update toolbar position on canvas interactions
     */
    private positionUpdateInterval: number | null = null;
    
    private setupPositionUpdates(toolbar: HTMLElement, node: any) {
        // Clear any existing interval
        if (this.positionUpdateInterval !== null) {
            window.clearInterval(this.positionUpdateInterval);
        }
        
        // Update position periodically to handle pan/zoom
        this.positionUpdateInterval = window.setInterval(() => {
            if (this.toolbarElement && node?.nodeEl) {
                this.positionToolbar(toolbar, node);
            }
        }, 50); // Update every 50ms for smooth following
    }

    /**
     * Remove the toolbar from DOM
     */
    private removeToolbar() {
        if (this.toolbarElement) {
            this.toolbarElement.remove();
            this.toolbarElement = null;
        }
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

    /**
     * Destroy the toolbar system completely
     */
    destroy() {
        this.cleanup();
    }

    /**
     * Toggle toolbar on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.removeToolbar();
        } else {
            // Refresh toolbar if there's a selection
            this.handleSelectionChange();
        }
    }

    /**
     * Check if toolbar is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Enable the toolbar
     */
    enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.handleSelectionChange();
        }
    }

    /**
     * Disable the toolbar
     */
    disable() {
        if (this.enabled) {
            this.enabled = false;
            this.removeToolbar();
        }
    }
}