
//src/features/latoile.ts

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

    async openTools(plugin: IMomePlugin, evt?: MouseEvent) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return;

        const opId = `latoile-tools-${Date.now()}`;

        try {
            plugin.busyIndicator.start(opId, "Fetching tools...");

            const response = await ApiService.getLaToileTools(
                plugin.settings.baseUrl, 
                API_PATHS.LA_TOILE_TOOLS, 
                ctx
            );
            
            const items = (response.tools || []).map((t: any) => ({ title: t.name, content: t.desc }));

            plugin.busyIndicator.end(opId);

            // 2. Pass 'evt' safely. 
            // If evt is undefined, the menu service (Obsidian's native Menu) 
            // usually requires an element or coordinates.
            // If showToolMenu uses Menu.showAtPosition or showAtMouseEvent,
            // we need to fake a fallback or use the active window center.
            
            // However, assuming showToolMenu uses the standard Menu.showAtMouseEvent(evt):
            if (!evt) {
                const { innerWidth, innerHeight } = window;
                evt = { 
                    clientX: innerWidth / 2, 
                    clientY: innerHeight / 2,
                    preventDefault: () => {},
                    stopPropagation: () => {}
                } as unknown as MouseEvent;
            }

            showToolMenu(evt, items, async (item) => {
                // @ts-ignore
                createNodeAtViewportCenter(ctx.canvas, item.title);
                // @ts-ignore
                setCanvasNodeColor(ctx.canvas, "6"); 
                
                await new Promise(r => setTimeout(r, 2000));
                
                await LaToile.execute(plugin);
            });
        } catch (error) {
            console.error("Failed to load LaToile tools", error);
            new Notice("Failed to fetch tools");
            plugin.busyIndicator.end(opId);
        }
    }
};

