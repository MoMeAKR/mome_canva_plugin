//commands/surgeon-menu-commands.ts

import { Editor, MarkdownView, Menu, Notice } from "obsidian";
import { IMomePlugin } from "../types";
import { getCanvasContext, getSelectedOrLastTextNode, getCanvasNodeTextAndSelection } from "../utils/canva-utils";
import { TheSurgeonCanvas } from "../features/thesurgeon";

export function registerSurgeonSelectionMenu(plugin: IMomePlugin) {
    plugin.registerEvent(
        plugin.app.workspace.on(
            "editor-menu",
            (menu: Menu, editor: Editor, view: MarkdownView | any) => {
                // We only care when this is the editor inside a canvas text node.
                const ctx = getCanvasContext(plugin.app);
                if (!ctx) return; // Not currently in a canvas

                const node = getSelectedOrLastTextNode(ctx.canvas);
                if (!node) return;

                const selInfo = getCanvasNodeTextAndSelection(node);
                if (!selInfo || !selInfo.selectedText || selInfo.selectedText.trim() === "") {
                    // No highlighted text → don’t show the menu item
                    return;
                }

                menu.addItem((item) => {
                    item
                        .setTitle("TheSurgeon on selection")
                        .setIcon("scissors")
                        .onClick(async () => {
                            await TheSurgeonCanvas.runOnNode(plugin);
                        });
                });
            }
        )
    );
}
