import { Plugin } from "obsidian";
import { CodeArtist } from "../features/codeartist";
import { LaToile } from "../features/latoile";
import { AppEngine } from "../features/appengine";
import { getCanvasContext, setCanvasNodeColor } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { IMomePlugin } from "../types";
import { openHeuristicSelector } from "../heuristic-modal";

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
    plugin.addCommand({
        id: 'open-mome-heuristics',
        name: 'Open Heuristic Function',
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if (ctx) {
                if (!checking) {
                    openHeuristicSelector(plugin, ctx, (heuristic: any, args: any) => {
                        // Format: HeuristicName | Arg1 | Arg2 ...
                        // Map args back to array based on heuristic.arguments order
                        const argValues = heuristic.arguments.map((argDef: any) => args[argDef.name] ?? "");
                        const content = [heuristic.name, ...argValues].join(" | ");
                        
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
}