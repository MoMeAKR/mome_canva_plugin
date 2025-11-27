// features/busy-indicator.ts
import { Plugin, setIcon } from "obsidian";

export class BusyIndicator {
    private plugin: Plugin;
    private statusBarItem: HTMLElement | null = null;
    private activeOperations: Set<string> = new Set();
    private iconElement: HTMLElement | null = null;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.createStatusBarItem();
    }

    /**
     * Create the status bar item
     */
    private createStatusBarItem() {
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.statusBarItem.addClass('mome-busy-indicator');
        this.statusBarItem.style.display = 'none';
    }

    /**
     * Start a busy operation
     * @param operationId Unique identifier for the operation
     * @param label Display label (e.g., "LaToile computing...")
     */
    start(operationId: string, label: string = "Processing...") {
        this.activeOperations.add(operationId);
        this.updateDisplay(label);
    }

    /**
     * End a busy operation
     * @param operationId Unique identifier for the operation
     */
    end(operationId: string) {
        this.activeOperations.delete(operationId);
        
        if (this.activeOperations.size === 0) {
            this.hide();
        }
    }

    /**
     * Check if any operations are active
     */
    isBusy(): boolean {
        return this.activeOperations.size > 0;
    }

    /**
     * Update the display
     */
    private updateDisplay(label: string) {
        if (!this.statusBarItem) return;

        this.statusBarItem.empty();
        
        // Add spinner icon
        this.iconElement = this.statusBarItem.createSpan({ cls: 'mome-busy-spinner' });
        setIcon(this.iconElement, 'loader-2');
        
        // Add label
        this.statusBarItem.createSpan({ text: ` ${label}`, cls: 'mome-busy-label' });
        
        this.statusBarItem.style.display = 'flex';
        this.statusBarItem.style.alignItems = 'center';
        this.statusBarItem.style.gap = '4px';
    }

    /**
     * Hide the indicator
     */
    private hide() {
        if (this.statusBarItem) {
            this.statusBarItem.style.display = 'none';
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.activeOperations.clear();
        // Status bar items are automatically cleaned up by Obsidian
    }
}

/**
 * Utility function to wrap async operations with busy indicator
 */
export async function withBusyIndicator<T>(
    indicator: BusyIndicator,
    operationId: string,
    label: string,
    operation: () => Promise<T>
): Promise<T> {
    indicator.start(operationId, label);
    try {
        return await operation();
    } finally {
        indicator.end(operationId);
    }
}