import { Notice } from "obsidian";
import { API_PATHS } from "../constants";
import { ApiService } from "../services/api-service";
import { showToolMenu } from "../services/menu-service";
import { getCanvasContext, setCanvasNodeColor } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { IMomePlugin } from "../types";

export const LaToile = {
    async execute(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        try {
            new Notice("LaToile: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.LA_TOILE, 
                ctx
            );
            
            console.log("[LaToile] Server Response:", result);

            if (result.updates && result.updates.length > 0) {
                console.log(`[LaToile] Processing ${result.updates.length} operations...`);
                let changesApplied = 0;

                result.updates.forEach((u: any) => {
                    const op = u.op || 'update';

                    // --- NODE OPERATIONS ---
                    if (op === 'add') {
                        console.log(`[LaToile] Adding node ${u.node.id}`);
                        // @ts-ignore
                        ctx.canvas.importData({ nodes: [u.node], edges: [] });
                        changesApplied++;
                    } 
                    else if (op === 'delete') {
                        // @ts-ignore
                        const node = ctx.canvas.nodes.get(u.id);
                        // @ts-ignore
                        if (node) { ctx.canvas.removeNode(node); changesApplied++; }
                    }
                    else if (op === 'update') {
                        // @ts-ignore
                        const node = ctx.canvas.nodes.get(u.id);
                        if (node) {
                            if (u.text !== undefined) {
                                if (typeof node.setText === "function") node.setText(u.text);
                                else node.text = u.text;
                            }
                            if (u.color !== undefined) {
                                if (typeof node.setColor === "function") node.setColor(u.color);
                                else node.color = u.color;
                            }
                            if (u.x !== undefined) node.x = u.x;
                            if (u.y !== undefined) node.y = u.y;
                            if (u.width !== undefined) node.width = u.width;
                            if (u.height !== undefined) node.height = u.height;
                            
                            changesApplied++;
                        }
                    }
                    
                    // --- EDGE OPERATIONS ---
                    else if (op === 'add_edge') {
                        console.log(`[LaToile] Adding edge ${u.edge.id}`);
                        // @ts-ignore
                        ctx.canvas.importData({ nodes: [], edges: [u.edge] });
                        changesApplied++;
                    }
                    else if (op === 'delete_edge') {
                        // @ts-ignore
                        const edge = ctx.canvas.edges.get(u.id);
                        // @ts-ignore
                        if (edge) { ctx.canvas.removeEdge(edge); changesApplied++; }
                    }
                    else if (op === 'update_edge') {
                        // @ts-ignore
                        const edge = ctx.canvas.edges.get(u.id);
                        if (edge) {
                            if (u.label !== undefined) edge.setLabel(u.label);
                            if (u.color !== undefined) edge.setColor(u.color);
                            changesApplied++;
                        }
                    }
                });

                if (changesApplied > 0) {
                    ctx.canvas.requestFrame();
                    ctx.canvas.requestSave();
                    new Notice(`Applied ${changesApplied} changes.`);
                }
            } else {
                if (result.message) new Notice(`LaToile: ${result.message}`);
            }

        } catch (e) {
            console.error("[LaToile] Error:", e);
            new Notice("LaToile execution failed.");
        }
    },

    async openTools(plugin: IMomePlugin, evt: MouseEvent) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return;

        try {
            const response = await ApiService.getLaToileTools(
                plugin.settings.baseUrl, 
                API_PATHS.LA_TOILE_TOOLS, 
                ctx
            );
            
            const items = (response.tools || []).map((t: any) => ({ title: t.name, content: t.desc }));

            showToolMenu(evt, items, async (item) => {
                createNodeAtViewportCenter(ctx.canvas, item.title);
                setCanvasNodeColor(ctx.canvas, "6"); 
                await new Promise(r => setTimeout(r, 2000));
                await LaToile.execute(plugin);
            });
        } catch (error) {
            console.error("Failed to load LaToile tools", error);
            new Notice("Failed to fetch tools");
        }
    }
};