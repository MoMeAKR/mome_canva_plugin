// src/commands/execution-commands.ts


import { Plugin } from "obsidian";
import { CodeArtist } from "../features/codeartist";
import { LaToile } from "../features/latoile";
import { AppEngine } from "../features/appengine";
import { getCanvasContext, setCanvasNodeColor } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { IMomePlugin } from "../types";
import { openHeuristicSelector, extractArgNames } from "../heuristic-modal";
import { Notice } from "obsidian";
import { PrefixInputModal } from "../features/utils";
import { JsonEditModal } from "../modals/json-edit-modals";
import { findJsonFence, getSelectedOrLastTextNode, setTextNodeText } from "../utils/canva-utils";
import { FullscreenNodeModal } from "../modals/fullscreen-node-modal";
import { TheSurgeonCanvas } from "features/thesurgeon";




export function editNodeJson(plugin: IMomePlugin) {
    const app = plugin.app;
    const ctx = getCanvasContext(app);
    
    // Safety check: though toolbar only appears on canvas, command palette might not
    if (!ctx) {
        new Notice("No active canvas found.");
        return;
    }

    const node = getSelectedOrLastTextNode(ctx.canvas);
    if (!node) {
        new Notice("Select a text node or ensure there is a last text node.");
        return;
    }

    const text = String((node as any).text ?? "");

    // Find the first ```json fenced block
    const fence = findJsonFence(text);
    if (!fence) {
        new Notice("No ```json fenced block found in the node.");
        return;
    }

    // Parse only the inner JSON
    let parsed: any;
    try {
        parsed = JSON.parse(fence.inner);
    } catch {
        new Notice("JSON inside ```json fenced block is invalid.");
        return;
    }

    const initial = Array.isArray(parsed)
        ? Object.fromEntries(parsed.map((v: any, i: number) => [String(i), v]))
        : parsed;

    new JsonEditModal(plugin.app, initial, (updated) => {
        const result = Array.isArray(parsed)
            ? Object.keys(updated).sort((a, b) => Number(a) - Number(b)).map(k => updated[k])
            : updated;

        const pretty = JSON.stringify(result, null, 2);

        // Replace only the fenced block, preserving header/closing and other text
        const newBlock = fence.header + pretty + fence.closing;
        const newText = text.slice(0, fence.start) + newBlock + text.slice(fence.end);

        setTextNodeText(ctx.canvas, node, newText);
        new Notice("Node JSON updated");
    }).open();
}

export function openNodeFullscreen(plugin: IMomePlugin) {
    const ctx = getCanvasContext(plugin.app);
    if (!ctx) {
        new Notice("No active canvas found.");
        return;
    }

    const node = getSelectedOrLastTextNode(ctx.canvas);
    if (!node) {
        new Notice("Select a text node or ensure there is a last text node.");
        return;
    }

    new FullscreenNodeModal(plugin.app, plugin, ctx.canvas, node, ctx.file.path).open();
}



export function registerExecutionCommands(plugin: IMomePlugin) {
    const app = plugin.app;

    // --- Commands ---
    plugin.addCommand({ id: 'execute_cOdEaRtIsT', name: 'CodeArtist graph computation', callback: () => CodeArtist.execute(plugin) });
    plugin.addCommand({ id: 'execute_cOdEaRtIsT_clean', name: 'CodeArtist clean descendents', callback: () => CodeArtist.execute_clean(plugin) });
    plugin.addCommand({ id: 'execute_cOdEaRtIsT_tests', name: 'CodeArtist Code Test', callback: () => CodeArtist.execute_code_backend(plugin) });
    plugin.addCommand({ id: 'execute_AppEngine', name: 'AppEngine graph computation', callback: () => AppEngine.execute(plugin) });
    plugin.addCommand({ id: 'execute_LaToile', name: 'Execute LaToile on current canva', callback: () => LaToile.execute(plugin) });
    

    plugin.addCommand({
        id: "mome-surgeon-canvas-node",
        name: "TheSurgeon on selected canvas node (with selection)",
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if (!ctx) return false;
            if (checking) return true;
            TheSurgeonCanvas.runOnNode(plugin);
            return true;
        }
    });


    plugin.addCommand({
    id: "mome-node-fullscreen",
    name: "Show selected node in fullscreen",
    checkCallback: (checking) => {
        const ctx = getCanvasContext(app);
        if (!ctx) return false;
        if (checking) return true;
        openNodeFullscreen(plugin);
        return true;
    }
    });


    plugin.addCommand({
        id: 'update-codeartist-tool-from-string',
        name: 'CodeArtist Tool Transform',
        checkCallback: (checking) => {
            if (getCanvasContext(app)) {
                if (!checking) CodeArtist.transformNode(plugin);
                return true;
            }
            return false;
        }
    });

    plugin.addCommand({
        id: "edit-node-json",
        name: "Edit JSON fields of selected node",
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if (!ctx) return false;

            if (checking) return true;

            // Call the shared function
            editNodeJson(plugin);
            return true;
        }
    });



    // Special "Execute Heuristic" Command (Orange + Send)
    plugin.addCommand({
        id: "execute_heuristic",
        name: "Current selection (or last) node to orange and execution",
        callback: async () => {
            const ctx = getCanvasContext(app);
            if (ctx) {
                setCanvasNodeColor(ctx.canvas, "2"); // Orange
                await new Promise(r => setTimeout(r, 2000));
                await LaToile.execute(plugin);
            }
        }
    });

    // Special "Execute Tool" Command (Red + Send)
    plugin.addCommand({
        id: "execute_tool",
        name: "Current selection (or last) node to red and execution",
        callback: async () => {
            const ctx = getCanvasContext(app);
            if (ctx) {
                setCanvasNodeColor(ctx.canvas, "1"); // Red
                await new Promise(r => setTimeout(r, 2000));
                await LaToile.execute(plugin);
            }
        }
    });


    plugin.addCommand({
    id: 'open-mome-heuristics',
    name: 'Open Heuristic Function',
    checkCallback: (checking) => {
        const ctx = getCanvasContext(app);
        if (ctx) {
            if (!checking) {
                openHeuristicSelector(plugin, ctx, (heuristic: any, args: any) => {
                    // Ensure arg values are collected in the correct order, regardless of format
                    const argNames = extractArgNames(heuristic.arguments || []);
                    const argValues = argNames.map((n) => {
                        const v = args[n];
                        return typeof v === "string" ? v : (v ?? "");
                    });
                    console.log(argValues);

                    const parts = [
                        heuristic.usable_name,
                        ...argValues.filter(v => (v ?? "").toString().trim() !== "")
                    ];
                    const content = parts.join(" | ");
                    const node = createNodeAtViewportCenter(ctx.canvas, content);
                    setCanvasNodeColor(ctx.canvas, "2", node); // Orange
                });
            }
            return true;
        }
        return false;
    }
});

    
    // Open Node Center + Purple (Legacy command 'open-canva-node')
    plugin.addCommand({
        id: 'open-canva-node',
        name: 'Opens canva node at screen center',
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if(ctx) {
                if(!checking) setCanvasNodeColor(ctx.canvas, '6'); // Purple
                return true;
            }
            return false;
        }
    });

plugin.addCommand({
    id: "delete-local-files-by-prefix",
    name: "Delete local files starting with a prefix",
    callback: () => {
        new PrefixInputModal(plugin.app, async (prefix: string) => {
            const files = plugin.app.vault.getFiles();
            const matched = files.filter(f => f.basename.startsWith(prefix));

            if (matched.length === 0) {
                new Notice(`No files starting with "${prefix}" found.`);
                return;
            }

            let deleted = 0;
            for (const file of matched) {
                try {
                    // Permanently delete the file
                    await plugin.app.vault.delete(file);

                    // If you prefer moving to system trash instead of permanent delete, use:
                    // await plugin.app.vault.trash(file, true);

                    deleted++;
                } catch (e) {
                    console.error(`[Mome] Failed to delete: ${file.path}`, e);
                }
            }

            new Notice(`Deleted ${deleted}/${matched.length} file(s) starting with "${prefix}".`);
        }).open();
    }
});

// Toggle Canvas Toolbar
    plugin.addCommand({
        id: "toggle-canvas-toolbar",
        name: "Toggle canvas node toolbar",
        callback: () => {
            if (plugin.canvasToolbar) {
                plugin.canvasToolbar.toggle();
                const isEnabled = plugin.canvasToolbar.isEnabled();
                new Notice(`Canvas toolbar ${isEnabled ? 'enabled' : 'disabled'}`);
            }
        }
    });

}