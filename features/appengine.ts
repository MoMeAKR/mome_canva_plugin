// src/features/appengine.ts

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
        const opId = `appengine-exec-${Date.now()}`;
        
        try {
            plugin.busyIndicator.start(opId, "AppEngine computing...");
            
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.APP_ENGINE, 
                ctx, 
                ids
            );
            
            console.log("[AppEngine] Response:", result);

            if (result.updates && result.updates.length > 0) {
                plugin.busyIndicator.start(opId, "Applying changes...");
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes`);
                }
            } else {
                new Notice(`AppEngine: ${result.message}`);
            }
        } catch (e) {
            console.error(e);
            new Notice(`AppEngine failure: ${e.message || e}`);
        } finally {
            plugin.busyIndicator.end(opId);
        }
    },

    async display(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        const opId = `appengine-display-${Date.now()}`;
        
        try {
            plugin.busyIndicator.start(opId, "AppEngine generating display...");

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
                new Notice("Received images"); 
                const saved = await saveImagesByPath(plugin.app, result.images);
                if (saved > 0) new Notice(`Saved ${saved} image${saved !== 1 ? "s" : ""} to vault`);
            } else{
                new Notice("No images"); 
            }

        } catch (e) {
            console.error(e);
            new Notice(`AppEngine display failure: ${e.message || e}`);
        } finally {
            plugin.busyIndicator.end(opId);
        }
    },

    // Updated openTools with event handling and busy indicator
    async openTools(plugin: IMomePlugin, evt?: MouseEvent) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const opId = `appengine-tools-${Date.now()}`;

        try {
            plugin.busyIndicator.start(opId, "Fetching AppEngine tools...");

            const items = await ApiService.getTools(plugin.settings.baseUrl, API_PATHS.APP_ENGINE_TOOLS);
            
            plugin.busyIndicator.end(opId);

            // Fallback if event is missing (e.g. triggered via command palette)
            if (!evt) {
                const { innerWidth, innerHeight } = window;
                evt = { 
                    clientX: innerWidth / 2, 
                    clientY: innerHeight / 2,
                    preventDefault: () => {},
                    stopPropagation: () => {}
                } as unknown as MouseEvent;
            }

            showToolMenu(evt, items, (item) => {
                // Re-fetch context inside callback just to be safe, though closure captures 'ctx'
                if (ctx) createNodeAtViewportCenter(ctx.canvas, item.content);
            });

        } catch (error) {
            console.error("Failed to load AppEngine tools", error);
            new Notice("Failed to fetch AppEngine tools");
            plugin.busyIndicator.end(opId);
        }
    }
};