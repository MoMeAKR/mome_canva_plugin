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



export function registerExecutionCommands(plugin: IMomePlugin) {
    const app = plugin.app;

    // --- Commands ---
    plugin.addCommand({ id: 'execute_cOdEaRtIsT', name: 'CodeArtist graph computation', callback: () => CodeArtist.execute(plugin) });
    plugin.addCommand({ id: 'execute_AppEngine', name: 'AppEngine graph computation', callback: () => AppEngine.execute(plugin) });
    plugin.addCommand({ id: 'execute_LaToile', name: 'Execute LaToile on current canva', callback: () => LaToile.execute(plugin) });
    
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

    // Open Heuristic Modal
    // plugin.addCommand({
    //     id: 'open-mome-heuristics',
    //     name: 'Open Heuristic Function',
    //     checkCallback: (checking) => {
    //         const ctx = getCanvasContext(app);
    //         if (ctx) {
    //             if (!checking) {
    //                 openHeuristicSelector(plugin, ctx, (heuristic: any, args: any) => {
    //                     // Format: HeuristicName | Arg1 | Arg2 ...
    //                     // Map args back to array based on heuristic.arguments order
    //                     const argValues = heuristic.arguments.map((argDef: any) => args[argDef.name] ?? "");
    //                     const content = [heuristic.name, ...argValues].join(" | ");
                        
    //                     createNodeAtViewportCenter(ctx.canvas, content);
    //                     setCanvasNodeColor(ctx.canvas, "2"); // Orange
    //                 });
    //             }
    //             return true;
    //         }
    //         return false;
    //     }
    // });
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

                    const content = [heuristic.usable_name, ...argValues].join(" | ");
                    createNodeAtViewportCenter(ctx.canvas, content);
                    setCanvasNodeColor(ctx.canvas, "2"); // Orange
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