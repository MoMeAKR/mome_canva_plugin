
import { Notice } from "obsidian";
import { API_PATHS } from "../constants";
import { ApiService } from "../services/api-service";
import { showToolMenu } from "../services/menu-service";
import { getCanvasContext, setCanvasNodeColor } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { IMomePlugin } from "../types";
import { applyGraphUpdates } from "./commons";


export const LaToile = {
    async execute(plugin: IMomePlugin) {


        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        // 1. Generate a unique ID for this operation
        const opId = `latoile-exec-${Date.now()}`;

        try {
            // 2. Start the busy indicator
            plugin.busyIndicator.start(opId, "LaToile computing...");

            // (Optional) Keep this if you want a toast notification too, 
            // but the spinner usually replaces the need for "Sending context..."
            // new Notice("LaToile: Sending context..."); 

            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.LA_TOILE, 
                ctx
            );
            
            console.log("[LaToile] Server Response:", result);

            if (result.updates && result.updates.length > 0) {
                console.log(`[LaToile] Processing ${result.updates.length} operations...`);
                
                // Update label to show we are now applying changes
                plugin.busyIndicator.start(opId, "Applying changes...");
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes.`);
                }
            } else {
                if (result.message) new Notice(`LaToile: ${result.message}`);
            }
        } catch (e) {
            console.error("[LaToile] Error:", e);
            new Notice(`LaToile failure: ${e?.message || e}`);
        } finally {
            plugin.busyIndicator.end(opId);
        }
    },



        //         let changesApplied = 0;

        //         result.updates.forEach((u: any) => {
        //             const op = u.op || 'update';

        //             // --- NODE OPERATIONS ---
        //             if (op === 'add') {
        //                 console.log(`[LaToile] Adding node ${u.node.id}`);
        //                 // @ts-ignore
        //                 ctx.canvas.importData({ nodes: [u.node], edges: [] });
        //                 changesApplied++;
        //             } 
        //             else if (op === 'delete') {
        //                 // @ts-ignore
        //                 const node = ctx.canvas.nodes.get(u.id);
        //                 // @ts-ignore
        //                 if (node) { ctx.canvas.removeNode(node); changesApplied++; }
        //             }
        //             else if (op === 'update') {
        //                 // @ts-ignore
        //                 const node = ctx.canvas.nodes.get(u.id);
        //                 if (node) {
        //                     if (u.text !== undefined) {
        //                         if (typeof node.setText === "function") node.setText(u.text);
        //                         else node.text = u.text;
        //                     }
        //                     if (u.color !== undefined) {
        //                         if (typeof node.setColor === "function") node.setColor(u.color);
        //                         else node.color = u.color;
        //                     }
        //                     if (u.x !== undefined) node.x = u.x;
        //                     if (u.y !== undefined) node.y = u.y;
        //                     if (u.width !== undefined) node.width = u.width;
        //                     if (u.height !== undefined) node.height = u.height;
                            
        //                     changesApplied++;
        //                 }
        //             }
                    
        //             // --- EDGE OPERATIONS ---
        //             else if (op === 'add_edge') {
        //                 console.log(`[LaToile] Adding edge ${u.edge.id}`);
        //                 // @ts-ignore
        //                 ctx.canvas.importData({ nodes: [], edges: [u.edge] });
        //                 changesApplied++;
        //             }
        //             else if (op === 'delete_edge') {
        //                 // @ts-ignore
        //                 const edge = ctx.canvas.edges.get(u.id);
        //                 // @ts-ignore
        //                 if (edge) { ctx.canvas.removeEdge(edge); changesApplied++; }
        //             }
        //             else if (op === 'update_edge') {
        //                 // @ts-ignore
        //                 const edge = ctx.canvas.edges.get(u.id);
        //                 if (edge) {
        //                     if (u.label !== undefined) edge.setLabel(u.label);
        //                     if (u.color !== undefined) edge.setColor(u.color);
        //                     changesApplied++;
        //                 }
        //             }
        //         });

        //         if (changesApplied > 0) {
        //             // @ts-ignore
        //             ctx.canvas.requestFrame();
        //             // @ts-ignore
        //             ctx.canvas.requestSave();
        //             new Notice(`Applied ${changesApplied} changes.`);
        //         }
        //     } else {
        //         if (result.message) new Notice(`LaToile: ${result.message}`);
        //     }

        // } catch (e) {
        //     console.error("[LaToile] Error:", e);
        //     new Notice("LaToile execution failed.");
        // } finally {
        //     // 3. Ensure we stop the indicator regardless of success or failure
        //     plugin.busyIndicator.end(opId);
        // }
    // },

    async openTools(plugin: IMomePlugin, evt: MouseEvent) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return;

        const opId = `latoile-tools-${Date.now()}`;

        try {
            // Start indicator for fetching tools
            plugin.busyIndicator.start(opId, "Fetching tools...");

            const response = await ApiService.getLaToileTools(
                plugin.settings.baseUrl, 
                API_PATHS.LA_TOILE_TOOLS, 
                ctx
            );
            
            const items = (response.tools || []).map((t: any) => ({ title: t.name, content: t.desc }));

            // We can stop the indicator here because the menu interaction is user-driven
            plugin.busyIndicator.end(opId);

            showToolMenu(evt, items, async (item) => {
                // @ts-ignore
                createNodeAtViewportCenter(ctx.canvas, item.title);
                // @ts-ignore
                setCanvasNodeColor(ctx.canvas, "6"); 
                
                // Small visual delay
                await new Promise(r => setTimeout(r, 2000));
                
                // execute() will trigger its own busy indicator
                await LaToile.execute(plugin);
            });
        } catch (error) {
            console.error("Failed to load LaToile tools", error);
            new Notice("Failed to fetch tools");
            // Ensure we stop if there was an error
            plugin.busyIndicator.end(opId);
        }
    }
};

