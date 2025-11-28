import { Notice, normalizePath, TFile } from "obsidian";
import { API_PATHS } from "../constants";
import { ApiService } from "../services/api-service";
import { showToolMenu } from "../services/menu-service";
import { getCanvasContext } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { IMomePlugin } from "../types";
import { applyGraphUpdates, saveImagesByPath } from "./commons";

export const AppEngine = {
    async execute(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        
        try {
            new Notice("AppEngine: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.APP_ENGINE, 
                ctx, 
                ids
            );
            
            console.log("[AppEngine] Response:", result);

            if (result.updates && result.updates.length > 0) {
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes`);
                }
            } else {
                new Notice(`AppEngine: ${result.message}`);
            }
        } catch (e) {
            console.error(e);
            new Notice("AppEngine Failed");
        }
    },

    async display(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        
        try {
            new Notice("AppEngine: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.APP_ENGINE_DISPLAY, 
                ctx, 
                ids
            );
            
            console.log("[AppEngine] Response:", result);

            if (result.updates && result.updates.length > 0) {
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes`);
                }
            } else {
                new Notice(`AppEngine: ${result.message}`);
            }

            if (Array.isArray(result.images) && result.images.length > 0) {
                const saved = await saveImagesByPath(plugin.app, result.images);
                if (saved > 0) new Notice(`Saved ${saved} image${saved !== 1 ? "s" : ""} to vault`);
            }


        } catch (e) {
            console.error(e);
            new Notice("AppEngine Failed");
        }
    },


    //         if (result.updates && result.updates.length > 0) {
    //             let changesApplied = 0;
    //              result.updates.forEach((u: any) => {
    //                 const op = u.op || 'update';

    //                 if (op === 'add') {
    //                     // @ts-ignore
    //                     ctx.canvas.importData({ nodes: [u.node], edges: [] });
    //                     changesApplied++;
    //                 }
    //                 else if (op === 'delete') {
    //                     // @ts-ignore
    //                     const node = ctx.canvas.nodes.get(u.id);
    //                     // @ts-ignore
    //                     if (node) { ctx.canvas.removeNode(node); changesApplied++; }
    //                 }
    //                 else if (op === 'update') {
    //                     // @ts-ignore
    //                     const node = ctx.canvas.nodes.get(u.id);
    //                     if (node) {
    //                         if (u.text !== undefined) {
    //                             if (typeof node.setText === 'function') node.setText(u.text);
    //                             else node.text = u.text;
    //                         }
    //                         if (u.color !== undefined) {
    //                             if (typeof node.setColor === 'function') node.setColor(u.color);
    //                             else node.color = u.color;
    //                         }
    //                         if (u.x !== undefined) node.x = u.x;
    //                         if (u.y !== undefined) node.y = u.y;
    //                         changesApplied++;
    //                     }
    //                 }
    //                 else if (op === 'add_edge') {
    //                     // @ts-ignore
    //                     ctx.canvas.importData({ nodes: [], edges: [u.edge] });
    //                     changesApplied++;
    //                 }
    //                 else if (op === 'delete_edge') {
    //                     // @ts-ignore
    //                     const edge = ctx.canvas.edges.get(u.id);
    //                     // @ts-ignore
    //                     if (edge) { ctx.canvas.removeEdge(edge); changesApplied++; }
    //                 }
    //                 else if (op === 'update_edge') {
    //                     // @ts-ignore
    //                     const edge = ctx.canvas.edges.get(u.id);
    //                     if (edge) {
    //                         if (u.label !== undefined) edge.setLabel(u.label);
    //                         if (u.color !== undefined) edge.setColor(u.color);
    //                         changesApplied++;
    //                     }
    //                 }
    //             });
                
    //             if (changesApplied > 0) {
    //                 ctx.canvas.requestFrame();
    //                 ctx.canvas.requestSave();
    //                 new Notice(`Applied ${changesApplied} changes`);
    //             }
    //         } else {
    //             new Notice(`AppEngine: ${result.message}`);
    //         }
    //     } catch (e) {
    //         console.error(e);
    //         new Notice("AppEngine Failed");
    //     }
    // },

    async openTools(plugin: IMomePlugin, evt: MouseEvent) {
        try {
            const items = await ApiService.getTools(plugin.settings.baseUrl, API_PATHS.APP_ENGINE_TOOLS);
            showToolMenu(evt, items, (item) => {
                const ctx = getCanvasContext(plugin.app);
                if (ctx) createNodeAtViewportCenter(ctx.canvas, item.content);
            });
        } catch (error) {
            console.error("Failed to load AppEngine tools", error);
            new Notice("Failed to fetch AppEngine tools");
        }
    }
};