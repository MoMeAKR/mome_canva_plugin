//src/main.ts

import { Plugin, Editor, MarkdownView, Menu } from "obsidian";
import { MomePluginSettings, DEFAULT_SETTINGS, IMomePlugin } from "./types";

// Features
import { LaToile } from "./features/latoile";
import { CodeArtist } from "./features/codeartist";
import { AppEngine } from "./features/appengine";
import { CanvasToolbar } from "features/canvasToolbar";
import { BusyIndicator } from "./features/busy-indicator";
import { TheSurgeonCanvas } from "./features/thesurgeon"

// Command Registers
import { registerNavigationCommands } from "./commands/navigation-commands";
import { registerColorCommands } from "./commands/color-commands";
import { registerNodeCommands } from "./commands/node-commands";
import { registerExecutionCommands, editNodeJson, openNodeFullscreen } from "./commands/execution-commands";
import { registerStateModalCommands } from "./commands/state-modal-commands";

// Menus 
import { registerSurgeonSelectionMenu } from "./commands/surgeon-menu-commands";


// Utils 
import { getCanvasContext, getSelectedOrLastTextNode, getCanvasNodeTextAndSelection } from "./utils/canva-utils";



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
        this.addRibbonIcon("laugh", "CodeArtist Test Code", () => CodeArtist.execute_code_backend(this));
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

        // --- Register Menus --- 
        registerSurgeonSelectionMenu(this);


        // --- Initialize Canvas Toolbar ---
        const toolbarButtons = [
        {
            icon: "gift",
            tooltip: "Heuristics",
            submenu: [
                { icon: "briefcase-medical", tooltip: "Open heuristics", callback: () => {(this.app as any).commands.executeCommandById("mome_canva_plugins:open-mome-heuristics");} },
                { icon: "haze", tooltip: "Edit JSON", callback: () => editNodeJson(this)},
                { icon: "ambulance", tooltip: "Fullscreen node", callback: () => openNodeFullscreen(this)},
                {icon: "scissors", tooltip: "TheSurgeon (node selection)", callback: () => TheSurgeonCanvas.runOnNode(this)},


            ]
        },
        {
            icon: "bolt",
            tooltip: "LaToile",
            submenu: [
                { icon: "bolt", tooltip: "Execute LaToile", callback: () => LaToile.execute(this) },
                { icon: "book", tooltip: "LaToile Tools", callback: (evt) => LaToile.openTools(this, evt) }
            ]
        },
        {
            icon: "bomb",
            tooltip: "CodeArtist",
            submenu: [
                { icon: "bomb", tooltip: "Execute CodeArtist", callback: () => CodeArtist.execute(this) },
                { icon: "codepen", tooltip: "Display Results", callback: () => CodeArtist.execute_display(this) },
                { icon: "laugh", tooltip: "Test Code", callback: () => CodeArtist.execute_code_backend(this) },
                { icon: "box", tooltip: "CodeArtist Tools", callback: (evt) => CodeArtist.openTools(this, evt) },
                { icon: "apple", tooltip: "Clean Node Descendents", callback: () => CodeArtist.execute_clean(this) },
                { icon: "wand", tooltip: "Transform Node", callback: () => CodeArtist.transformNode(this) }
            ]
        },
        {
            icon: "boom-box",
            tooltip: "Engine",
            submenu: [
                { icon: "boom-box", tooltip: "Execute Engine", callback: () => AppEngine.execute(this) },
                { icon: "banana", tooltip: "Display Results", callback: () => AppEngine.display(this) },
                { icon: "binary", tooltip: "Show Tools", callback: (evt) => AppEngine.openTools(this, evt) }

            ]
        }
    ];
        this.canvasToolbar = new CanvasToolbar(this, toolbarButtons);
        this.canvasToolbar.initialize();


        this.registerEvent(
            this.app.workspace.on(
                "editor-menu",
                (menu: Menu, editor: Editor, view: MarkdownView | any) => {
                    // We only care when this is the editor inside a canvas text node.
                    // Those are not regular MarkdownViews, so we check via our own canvas context.
                    const ctx = getCanvasContext(this.app);
                    if (!ctx) return; // Not currently in a canvas

                    // Try to get the node corresponding to the active iframe/editor.
                    // Simplest practical heuristic: use the currently selected/last text node.
                    const node = getSelectedOrLastTextNode(ctx.canvas);
                    if (!node) return;

                    // Try to get selection info for that node.
                    const selInfo = getCanvasNodeTextAndSelection(node);
                    if (!selInfo || !selInfo.selectedText || selInfo.selectedText.trim() === "") {
                        // No highlighted text → don’t show the TheSurgeon entry.
                        return;
                    }

                    // If we reached here, we’re in a canvas context with selected text.
                    menu.addItem((item) => {
                        item
                            .setTitle("TheSurgeon on selection")
                            .setIcon("scissors")
                            .onClick(async () => {
                                // Delegate to the existing TheSurgeonCanvas logic,
                                // but we can directly reuse runOnNode — it re-fetches
                                // selection internally, which is fine.
                                await TheSurgeonCanvas.runOnNode(this as IMomePlugin);
                            });
                    });
                }
            )
        );

   

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

