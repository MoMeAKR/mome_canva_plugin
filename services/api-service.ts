import { Notice } from "obsidian";
import { ToolItem } from "../types";
import { CanvasContext } from "../utils/canva-utils";

const buildUrl = (base: string, path: string) => {
    const cleanBase = base.replace(/\/$/, ""); 
    const cleanPath = path.replace(/^\//, ""); 
    return `${cleanBase}/${cleanPath}`;
};

const isLocalhost = (url: string) => {
    return url.includes("localhost") || url.includes("127.0.0.1");
};

// Enhanced Debug Logger
async function logDebug(ctx: CanvasContext, title: string, data: any) {
    try {
        const vault = ctx.view.app.vault;
        const adapter = vault.adapter;
        const filename = "MOME_DEBUG.md";
        
        const timestamp = new Date().toISOString();
        const logContent = `# ${title} (${timestamp})\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;
        
        // Appending to keep history of previous calls
        if (await adapter.exists(filename)) {
            await adapter.append(filename, logContent);
        } else {
            await adapter.write(filename, logContent);
        }
    } catch (e) {
        console.error("Failed to write debug log", e);
    }
}

async function post<T>(baseUrl: string, path: string, body: any): Promise<T> {
    const url = buildUrl(baseUrl, path);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(error);
        new Notice(`API Error: ${url}`);
        throw error;
    }
}

async function get<T>(baseUrl: string, path: string): Promise<T> {
    const url = buildUrl(baseUrl, path);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(error);
        new Notice(`API Error: ${url}`);
        throw error;
    }
}

export const ApiService = {
    getTools: (baseUrl: string, path: string) => get<ToolItem[]>(baseUrl, path),
    
    sendGraphContext: async (baseUrl: string, endpoint: string, ctx: CanvasContext, nodeIds: string[] = []) => {
        const local = false; // Force Remote for Tablet Debugging

        const body: any = {
            selected_node_ids: nodeIds.length > 0 ? nodeIds : undefined
        };

        if (local) {
            body.canvas_path = ctx.absolutePath;
        } else {
            body.relative_path = ctx.relativePath;
            body.canvas_content = ctx.canvasData; 
        }

        await logDebug(ctx, `REQUEST: ${endpoint}`, { ...body, canvas_content: "OMITTED_LOG" });
        
        const response = await post<{ updates?: any[], message: string, status: string }>(baseUrl, endpoint, body);
        
        await logDebug(ctx, `RESPONSE: ${endpoint}`, response);
        
        return response;
    },

    getLaToileTools: async (baseUrl: string, path: string, ctx: CanvasContext) => {
        const local = false; 
        const body: any = {};

        if (local) {
            body.canvas_path = ctx.absolutePath;
        } else {
            body.relative_path = ctx.relativePath;
        }
        
        return post<any>(baseUrl, path, body);
    },

    // NEW: Fetch heuristics descriptions (Required by heuristic-modal.ts)
    getHeuristicsDesc: async (baseUrl: string, path: string, ctx: CanvasContext) => {
        const local = false; 
        const body: any = {};

        if (local) {
            body.canvas_path = ctx.absolutePath;
        } else {
            // Server looks for tools.json locally relative to this path
            body.relative_path = ctx.relativePath;
        }
        return post<any>(baseUrl, path, body);
    },

    updateNodeContent: (baseUrl: string, path: string, target: string, nodeId: string, ctx: CanvasContext) => {
        const local = false; 
        const body: any = { target, node_id: nodeId };

        if (local) {
            body.canvas_path = ctx.absolutePath;
        } else {
            body.relative_path = ctx.relativePath;
        }
        return post<any>(baseUrl, path, body);
    }
};