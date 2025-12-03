import { Plugin, setIcon, Platform } from "obsidian";

export class BusyIndicator {
    private plugin: Plugin;
    private containerElement: HTMLElement | null = null;
    private activeOperations: Set<string> = new Set();
    
    // We keep track if we are in mobile mode for cleanup logic
    private isMobileView: boolean;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.isMobileView = Platform.isMobile; // Detect platform
        this.initializeContainer();
    }

    /**
     * Initialize the container based on platform
     */
    private initializeContainer() {
        // We force floating mode if it's mobile OR if we are on a tablet-sized window
        // You can also simply force it ALWAYS if you prefer the floating pill style everywhere.
        if (this.isMobileView) {
            this.createFloatingContainer();
        } else {
            // Try to add to status bar
            try {
                this.containerElement = this.plugin.addStatusBarItem();
                this.containerElement.addClass('mome-busy-indicator');
                this.containerElement.style.display = 'none';
            } catch (e) {
                // If status bar fails (unlikely on desktop), fallback to floating
                console.log("Status bar not available, falling back to floating");
                this.createFloatingContainer();
            }
        }
    }

    private createFloatingContainer() {
        // Append directly to body to escape any layout containers
        this.containerElement = document.body.createEl("div", {
            cls: "mome-floating-indicator"
        });
        this.containerElement.style.display = "none";
    }

    /**
     * Start a busy operation
     */
    start(operationId: string, label: string = "Processing...") {
        this.activeOperations.add(operationId);
        this.updateDisplay(label);
    }

    /**
     * End a busy operation
     */
    end(operationId: string) {
        this.activeOperations.delete(operationId);
        
        if (this.activeOperations.size === 0) {
            this.hide();
        }
    }

    isBusy(): boolean {
        return this.activeOperations.size > 0;
    }

    /**
     * Update the display content
     */
    private updateDisplay(label: string) {
        if (!this.containerElement) return;

        // Clear previous content
        this.containerElement.empty();
        
        // 1. Add spinner icon
        const iconSpan = this.containerElement.createSpan({ cls: 'mome-busy-spinner' });
        setIcon(iconSpan, 'loader-2');
        
        // 2. Add label
        this.containerElement.createSpan({ text: label, cls: 'mome-busy-label' });
        
        // 3. Ensure visibility
        // On mobile we use flex, on desktop the status bar item handles it
        this.containerElement.style.display = 'flex';
        
        if (!this.isMobileView) {
            // Specific styles for Status Bar alignment
            this.containerElement.style.alignItems = 'center';
            this.containerElement.style.gap = '4px';
        }
    }

    private hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
        }
    }

    destroy() {
        this.activeOperations.clear();
        
        // Important: Manual cleanup for Mobile elements
        if (this.isMobileView && this.containerElement) {
            this.containerElement.remove();
        }
        
        // Desktop Status Bar items are automatically cleaned up by Obsidian 
        // when the plugin unloads, but setting to null is good practice.
        this.containerElement = null;
    }
}

/**
 * Utility function remains the same
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