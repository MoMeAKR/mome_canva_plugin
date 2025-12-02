import { Notice } from "obsidian";
import { IMomePlugin } from "../types";
import { API_PATHS } from "../constants";
import { ApiService } from "../services/api-service";
import { showToolMenu } from "../services/menu-service";
import { getCanvasContext } from "../utils/canva-utils";
import { createNodeAtViewportCenter } from "../utils/node-utils";
import { applyGraphUpdates } from "./commons";
import { resourceUsage } from "process";

export const CodeArtist = {
    async execute(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");
        
        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        
        try {
            new Notice("CodeArtist: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.CODE_ARTIST, 
                ctx, 
                ids
            );

            console.log("[CodeArtist] Response:", result);
            if (result.updates && result.updates.length > 0) {
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes.`);
                }
            } else {
                new Notice(`CodeArtist: ${result.message}`);
            }
        } catch (e) {
            console.error(e);
            new Notice(`CodeArtist error: ${e?.message || e}`);

        }
    },

    async execute_display(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        
        try {
            new Notice("CodeArtist: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.CODE_ARTIST_DISPLAY, 
                ctx, 
                ids
            );
            
            console.log("[CodeArtist] Response:", result);

            if (result.updates && result.updates.length > 0) {
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes`);
                }
            } else {
                new Notice(`CodeArtist display: ${result.message}`);
            }

            // if (Array.isArray(result.images) && result.images.length > 0) {
            //     const saved = await saveImagesByPath(plugin.app, result.images);
            //     if (saved > 0) new Notice(`Saved ${saved} image${saved !== 1 ? "s" : ""} to vault`);
            // }


        } catch (e) {
            console.error(e);
            new Notice(`CodeArtist display failure: ${e.message || e}`);
        }
    },

    async execute_clean(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");
        
        const ids = Array.from(ctx.canvas.selection).map((n: any) => n.id);
        
        try {
            new Notice("CodeArtist clean: Sending context...");
            const result = await ApiService.sendGraphContext(
                plugin.settings.baseUrl, 
                API_PATHS.CODE_ARTIST_CLEAN, 
                ctx, 
                ids
            );

            console.log("[CodeArtist] Response:", result);

            if (result.updates && result.updates.length > 0) {
                const changesApplied = applyGraphUpdates(ctx, result.updates);
                if (changesApplied > 0) {
                    new Notice(`Applied ${changesApplied} changes.`);
                }
            } else {
                new Notice(`CodeArtist clean: ${result.message}`);
            }
        } catch (e) {
            console.error(e);
            new Notice("CodeArtist clean Failed");
        }
    },

    async openTools(plugin: IMomePlugin, evt?: MouseEvent) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx) return new Notice("No canvas found");

        const opId = `codeartist-tools-${Date.now()}`;

        try {
            plugin.busyIndicator.start(opId, "Fetching CodeArtist tools...");

            const items = await ApiService.getTools(plugin.settings.baseUrl, API_PATHS.CODE_TOOLS);
            
            plugin.busyIndicator.end(opId);

            // Fallback if event is missing
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
                // Re-fetch context ensures we have the latest canvas reference
                if (ctx) createNodeAtViewportCenter(ctx.canvas, item.content);
            });

        } catch (e) {
            console.error("Failed to fetch CodeArtist tools", e);
            new Notice("Failed to fetch tools");
            plugin.busyIndicator.end(opId);
        }
    },

    async transformNode(plugin: IMomePlugin) {
        const ctx = getCanvasContext(plugin.app);
        if (!ctx || ctx.canvas.selection.size !== 1) return new Notice("Select 1 node");
        
        const node = ctx.canvas.selection.values().next().value as any;
        const content = node.text?.trim();
        
        try {
            const result = await ApiService.updateNodeContent(
                plugin.settings.baseUrl, 
                API_PATHS.GET_NODE_CONTENT, 
                content, 
                node.id, 
                ctx
            );

            if (result.content) {
                if (typeof node.setText === 'function') node.setText(result.content);
                else node.text = result.content;
                
                ctx.canvas.requestFrame();
                ctx.canvas.requestSave();
                new Notice("Node updated.");
            }
        } catch (e) {
            console.error(e);
        }
    }
};

