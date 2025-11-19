import { Plugin } from "obsidian";
import { MomePluginSettings, DEFAULT_SETTINGS, IMomePlugin } from "./types";

// Features
import { LaToile } from "./features/latoile";
import { CodeArtist } from "./features/codeartist";
import { AppEngine } from "./features/appengine";

// Command Registers
import { registerNavigationCommands } from "./commands/navigation-commands";
import { registerColorCommands } from "./commands/color-commands";
import { registerNodeCommands } from "./commands/node-commands";
import { registerExecutionCommands } from "./commands/execution-commands";
import { registerStateModalCommands } from "./commands/state-modal-commands";

export default class mOmE_Canva extends Plugin implements IMomePlugin {
    settings: MomePluginSettings;

    async onload() {
        console.log("=== mOmE_Canva plugin loaded ===");

        await this.loadSettings();

        // --- Ribbon Icons ---
        // Pass 'this' (the plugin instance) to features so they can access settings
        this.addRibbonIcon("bolt", "Execute LaToile", () => LaToile.execute(this));
        this.addRibbonIcon("bomb", "CodeArtist Exec", () => CodeArtist.execute(this));
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
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}


