import { Plugin, Notice } from "obsidian";
import { getCanvasContext, getLastNode } from "../utils/canva-utils";
import { addNode, copyNodeIdToClipboard } from "../utils/node-utils";

export function registerNodeCommands(plugin: Plugin) {
    plugin.addCommand({
        id: 'create-new-canva-node',
        name: 'Create-new-canva-node',
        hotkeys: [{ modifiers: ['Mod'], key: 'h' }],
        callback: () => {
            const ctx = getCanvasContext(plugin.app);
            if (!ctx) return new Notice("Not in canvas");

            const lastNode = getLastNode(ctx.canvas) as any;
            const x = lastNode ? lastNode.x + lastNode.width + 50 : 0;
            const y = lastNode ? lastNode.y : 0;
            const id = crypto.randomUUID();

            addNode(ctx.canvas, id, {
                x, y, width: 300, height: 200, type: 'text', content: 'New Node',
            });

            // Zoom to new node
            const actualNode = Array.from(ctx.canvas.nodes.values()).find((n: any) => n.id === id);
            if (actualNode) {
                ctx.canvas.selection.clear();
                ctx.canvas.selection.add(actualNode);
                ctx.canvas.zoomToSelection();
                requestAnimationFrame(() => (actualNode as any).startEditing());
                ctx.canvas.requestSave();
            }
        }
    });

    plugin.addCommand({
        id: 'm0me-copy-node-id',
        name: 'Copy selected node ID to clipboard',
        hotkeys: [{ modifiers: ['Alt'], key: 'c' }],
        checkCallback: (checking) => {
            const ctx = getCanvasContext(plugin.app);
            if (ctx) {
                if (!checking && ctx.canvas.selection.size === 1) {
                    copyNodeIdToClipboard(ctx.canvas.selection.values().next().value);
                }
                return true;
            }
            return false;
        }
    });

    plugin.addCommand({
        id: 'm0me-start-editing',
        name: 'Start editing selected node',
        hotkeys: [{ modifiers: ['Mod'], key: 'E' }],
        checkCallback: (checking) => {
            const ctx = getCanvasContext(plugin.app);
            if (ctx && ctx.canvas.selection.size === 1) {
                if (!checking) {
                    const node = ctx.canvas.selection.values().next().value;
                    if (!node.isEditing) node.startEditing();
                }
                return true;
            }
            return false;
        }
    });
}


