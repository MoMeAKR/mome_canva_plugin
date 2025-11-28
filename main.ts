import { Plugin } from "obsidian";
import { MomePluginSettings, DEFAULT_SETTINGS, IMomePlugin } from "./types";

// Features
import { LaToile } from "./features/latoile";
import { CodeArtist } from "./features/codeartist";
import { AppEngine } from "./features/appengine";
import { CanvasToolbar } from "features/canvasToolbar";
import { BusyIndicator } from "./features/busy-indicator";

// Command Registers
import { registerNavigationCommands } from "./commands/navigation-commands";
import { registerColorCommands } from "./commands/color-commands";
import { registerNodeCommands } from "./commands/node-commands";
import { registerExecutionCommands } from "./commands/execution-commands";
import { registerStateModalCommands } from "./commands/state-modal-commands";


export default class mOmE_Canva extends Plugin implements IMomePlugin {
    settings: MomePluginSettings;
    canvasToolbar: CanvasToolbar;
    busyIndicator: BusyIndicator ;

    async onload() {
        console.log("=== mOmE_Canva plugin loaded ===");
        await this.loadSettings();

        this.busyIndicator = new BusyIndicator(this); 

        // --- Ribbon Icons ---
        // Pass 'this' (the plugin instance) to features so they can access settings
        this.addRibbonIcon("bolt", "Execute LaToile", () => LaToile.execute(this));
        this.addRibbonIcon("bomb", "CodeArtist Exec", () => CodeArtist.execute(this));
        this.addRibbonIcon("apple", "CodeArtist clean descendents", () => CodeArtist.execute_clean(this));
        this.addRibbonIcon("box", "CodeArtist Tools", (evt) => CodeArtist.openTools(this, evt));
        this.addRibbonIcon("wand", "Transform tool node", () => CodeArtist.transformNode(this));
        this.addRibbonIcon("book", "LaToile Tools", (evt) => LaToile.openTools(this, evt));
        this.addRibbonIcon("binary", "AppEngine Tools", (evt) => AppEngine.openTools(this, evt));
        this.addRibbonIcon("boom-box", "AppEngine", () => AppEngine.execute(this));

        // --- Register Commands ---
        registerNavigationCommands(this);
        registerColorCommands(this);
        registerNodeCommands(this);
        registerExecutionCommands(this);
        registerStateModalCommands(this);

        // --- Initialize Canvas Toolbar ---
        const toolbarButtons = [
            {
                icon: "briefcase-medical", 
                tooltip: "Open heuristics", 
                // command: "open-mome-heuristics"
                callback: () => {(this.app as any).commands.executeCommandById("mome_canva_plugins:open-mome-heuristics");}
            },
            {
                icon: 'bolt',
                tooltip: 'Execute LaToile',
                // command: 'execute_LaToile'
                callback: () => LaToile.execute(this)
            },
            {
                icon: 'bomb',
                tooltip: 'Execute CodeArtist',
                // command: 'execute_cOdEaRtIsT'
                callback: () => CodeArtist.execute(this)
            },
            {
                icon: 'apple',
                tooltip: 'Clean CodeArtist descendents ',
                // command: 'execute_cOdEaRtIsT'
                callback: () => CodeArtist.execute_clean(this)
            },
            {
                icon: 'wand',
                tooltip: 'CodeArtist Transform node',
                // command: 'update-codeartist-tool-from-string'
                callback: () => CodeArtist.transformNode(this)
            }, 
            {
                icon: 'boom-box',
                tooltip: 'Execute Engine',
                // command: 'update-codeartist-tool-from-string'
                callback: () => AppEngine.execute(this)
            },
            {
                icon: 'banana',
                tooltip: 'Engine Display',
                // command: 'update-codeartist-tool-from-string'
                callback: () => AppEngine.display(this)
            }

        ];

        this.canvasToolbar = new CanvasToolbar(this, toolbarButtons);
        this.canvasToolbar.initialize();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        // Clean up canvas toolbar
        if (this.canvasToolbar) {
            this.canvasToolbar.destroy();
        }

        // Clean up busy indicator
        if (this.busyIndicator) {
            this.busyIndicator.destroy();
        }
    }
}


