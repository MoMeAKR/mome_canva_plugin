//services/api-service.ts

import { Notice, Vault, TFile, App } from "obsidian";
import { ToolItem } from "../types";
import { CanvasContext } from "../utils/canva-utils";
import { ImagePayload } from "../features/commons";



// function uint8ToBase64(u8: Uint8Array): string {
//     let CHUNK_SIZE = 0x8000;
//     let index = 0;
//     let length = u8.length;
//     let result = '';
//     let slice;
//     while (index < length) {
//         slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, length));
//         result += String.fromCharCode.apply(null, Array.from(slice));
//         index += CHUNK_SIZE;
//     }
//     return btoa(result);
// }

function uint8ToBase64(u8: Uint8Array): string {
    // Browser-safe base64 encoding for large arrays
    let CHUNK_SIZE = 0x8000;
    let index = 0;
    let length = u8.length;
    let result = '';
    let slice;
    while (index < length) {
        slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, length));
        result += String.fromCharCode.apply(null, Array.from(slice));
        index += CHUNK_SIZE;
    }
    return btoa(result);
}

async function getEmbeddedImagesFromColoredNodes(
    vault: Vault,
    canvasData: any
): Promise<ImagePayload[]> {
    const images: ImagePayload[] = [];
    const seen = new Set<string>();

    const nodes = (canvasData?.nodes || []).filter(
        (n: any) => typeof n.color === "string" && n.color !== "0"
    );

    for (const node of nodes) {
        const text = node.text || node.label || "";
        const matches = [...text.matchAll(/!\[\[([^\]]+)\]\]/g)];
        for (const match of matches) {
            const imgPath = match[1];
            if (seen.has(imgPath)) continue;
            seen.add(imgPath);

            const file = vault.getAbstractFileByPath(imgPath);
            if (!file || !(file instanceof TFile)) continue;

            try {
                if (typeof vault.readBinary !== "function") {
                    new Notice("Image sync is not supported on this platform (mobile limitation).");
                    continue;
                }
                const arrayBuffer = await vault.readBinary(file);

                let b64: string;
                if (typeof Buffer !== "undefined") {
                    b64 = Buffer.from(arrayBuffer).toString("base64");
                } else {
                    b64 = uint8ToBase64(new Uint8Array(arrayBuffer));
                }
                images.push({ path: imgPath, b64_image: b64 });
            } catch (e) {
                let msg = "Unknown error";
                if (e instanceof Error) msg = e.message;
                else if (typeof e === "string") msg = e;
                else try { msg = JSON.stringify(e); } catch {}
                new Notice(`Failed to read image for embed: ${imgPath}\n${msg}`);
            }
        }
    }
    return images;
}


// async function getEmbeddedImagesFromColoredNodes(
//     vault: Vault,
//     canvasData: any
// ): Promise<ImagePayload[]> {
//     const images: ImagePayload[] = [];
//     const seen = new Set<string>();

//     const nodes = (canvasData?.nodes || []).filter(
//         (n: any) => typeof n.color === "string" && n.color !== "0"
//     );

//     let msg = `Considering ${nodes.length} colored nodes`;
//     // new Notice(msg);
//     // await logToMomeDebug2(vault, msg);

//     for (const node of nodes) {
//         const text = node.text || node.label || "";
//         const matches = [...text.matchAll(/!\[\[([^\]]+)\]\]/g)];
//         if (matches.length > 0) {
//             msg = `Node has ${matches.length} image embed(s)`;
//             new Notice(msg);
//             await logToMomeDebug2(vault, msg);
//         }
//         for (const match of matches) {
//             const imgPath = match[1];
//             if (seen.has(imgPath)) {
//                 msg = `Already processed: ${imgPath}`;
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);
//                 continue;
//             }
//             seen.add(imgPath);

//             msg = `Looking for file: ${imgPath}`;
//             new Notice(msg);
//             await logToMomeDebug2(vault, msg);

//             const file = vault.getAbstractFileByPath(imgPath);
//             if (!file) {
//                 msg = `File not found: ${imgPath}`;
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);
//                 continue;
//             }
//             if (!(file instanceof TFile)) {
//                 msg = `Not a file: ${imgPath}`;
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);
//                 continue;
//             }
//             try {
//                 if (typeof vault.readBinary !== "function") {
//                     msg = "Image sync is not supported on this platform (mobile limitation).";
//                     new Notice(msg);
//                     await logToMomeDebug2(vault, msg);
//                     continue;
//                 }
//                 msg = `Reading binary for: ${imgPath}`;
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);

//                 const arrayBuffer = await vault.readBinary(file);

//                 let b64: string;
//                 if (typeof Buffer !== "undefined") {
//                     msg = `Encoding with Buffer: ${imgPath}`;
//                     new Notice(msg);
//                     await logToMomeDebug2(vault, msg);
//                     b64 = Buffer.from(arrayBuffer).toString("base64");
//                 } else {
//                     msg = `Encoding with uint8ToBase64: ${imgPath}`;
//                     new Notice(msg);
//                     await logToMomeDebug2(vault, msg);
//                     b64 = uint8ToBase64(new Uint8Array(arrayBuffer));
//                 }
//                 images.push({ path: imgPath, b64_image: b64 });
//                 msg = `Image processed: ${imgPath}`;
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);
//             } catch (e) {
//                 let errMsg = "Unknown error";
//                 if (e instanceof Error) errMsg = e.message + (e.stack ? "\n" + e.stack : "");
//                 else if (typeof e === "string") errMsg = e;
//                 else try { errMsg = JSON.stringify(e); } catch {}
//                 msg = `Failed to read image for embed: ${imgPath}\n${errMsg}`;
//                 console.error("Failed to read image for embed:", imgPath, e, typeof e, e && Object.keys(e));
//                 new Notice(msg);
//                 await logToMomeDebug2(vault, msg);
//             }
//         }
//     }
//     msg = `Returning ${images.length} images`;
//     new Notice(msg);
//     await logToMomeDebug2(vault, msg);

//     return images;
// };


async function logToMomeDebug2(vault: Vault, message: string) {
    try {
        const filename = "mome_debug2.md";
        const timestamp = new Date().toISOString();
        const logEntry = `\n---\n${timestamp}\n${message}\n`;

        const adapter = vault.adapter;
        if (await adapter.exists(filename)) {
            await adapter.append(filename, logEntry);
        } else {
            await adapter.write(filename, logEntry);
        }
    } catch (e) {
        console.error("Failed to write to mome_debug2.md:", e);
    }
}



// async function getEmbeddedImagesFromColoredNodes(
//     vault: Vault,
//     canvasData: any
// ): Promise<ImagePayload[]> {
//     const images: ImagePayload[] = [];
//     const seen = new Set<string>();

//     const nodes = (canvasData?.nodes || []).filter(
//         (n: any) => typeof n.color === "string" && n.color !== "0"
//     );

//     new Notice(`Considering ${nodes.length} nodes`); 
//     for (const node of nodes) {
//         const text = node.text || node.label || "";
//         const matches = [...text.matchAll(/!\[\[([^\]]+)\]\]/g)];
//         for (const match of matches) {
//             new Notice(`Found path at ${match[1]}`); 
//             const imgPath = match[1];
//             if (seen.has(imgPath)) continue;
//             seen.add(imgPath);

//             const file = vault.getAbstractFileByPath(imgPath);
//             if (file instanceof TFile) {
//                 try {
//                     const arrayBuffer = await vault.readBinary(file);
//                     let b64: string;
//                     if (typeof Buffer !== "undefined") {
//                         b64 = Buffer.from(arrayBuffer).toString("base64");
//                     } else {
//                         b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
//                     }
//                     images.push({ path: imgPath, b64_image: b64 });
//                 } catch (e) {
//                     let msg = "Unknown error";
//                     if (e instanceof Error) msg = e.message;
//                     else if (typeof e === "string") msg = e;
//                     else try { msg = JSON.stringify(e); } catch {}
//                     console.error("Failed to read image for embed:", imgPath, e);
//                     new Notice(`Error image for embed: ${msg}`);

//                 }
//             }
//         }
//     }
//     new Notice(`Returning ${images.length} images`); 
//     return images;
// }; 



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
    // Helper to recursively omit b64_image fields
    function omitB64(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(omitB64);
        } else if (obj && typeof obj === "object") {
            const out: any = {};
            for (const [k, v] of Object.entries(obj)) {
                if (k === "b64_image") {
                    out[k] = "[omitted]";
                } else if (k === "canvas_content") {
                    out[k] = "[omitted]";
                } else {
                    out[k] = omitB64(v);
                }
            }
            return out;
        }
        return obj;
    }

    try {
        // Extract image info if present
        let imageInfo = "";
        if (Array.isArray(data?.embedded_images)) {
            const count = data.embedded_images.length;
            const paths = data.embedded_images.map((img: any) => img.path).join(", ");
            imageInfo = `Images sent: ${count}\nImage paths: ${paths}\n`;
        } else {
            imageInfo = "No images sent.\n";
        }

        // Log command/endpoint if present
        let commandInfo = "";
        if (title) commandInfo = `Command/Endpoint: ${title}\n`;

        // Omit b64 and canvas_content for the rest of the payload
        const safeData = omitB64(data);

        // Log everything to console
        const logString =
            `=== API DEBUG ===\n${commandInfo}${imageInfo}Payload:\n${JSON.stringify(safeData, null, 2)}\n`;
        console.log(logString);

        // Write to file in vault
        const vault = ctx.view?.app?.vault ?? ctx.app?.vault;
        const adapter = vault?.adapter;
        if (adapter) {
            const filename = "MOME_DEBUG.md";
            const timestamp = new Date().toISOString();
            const fileLog =
                `# ${title} (${timestamp})\n\n` +
                (imageInfo ? `**${imageInfo}**\n` : "") +
                "```json\n" +
                JSON.stringify(safeData, null, 2) +
                "\n```\n\n";
            if (await adapter.exists(filename)) {
                await adapter.append(filename, fileLog);
            } else {
                await adapter.write(filename, fileLog);
            }
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

        if (!response.ok) {
            // Try to extract error message from JSON body
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const data = await response.json();
                if (data && data.error) {
                    errorMsg = data.error;
                }
            } catch (jsonErr) {
                // Ignore JSON parse errors, keep default errorMsg
            }
            throw new Error(errorMsg);
        }   

        return await response.json();
    } catch (error) {
        console.error(error);
        // new Notice(`API Error: ${error.message || error}`);
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
    
    sendGraphContext: async (baseUrl: string, endpoint: string, ctx: CanvasContext) => {
        const local = isLocalhost(baseUrl);

        const body: any = {};

        if (local) {
            body.canvas_path = ctx.absolutePath;
        } else {
            body.relative_path = ctx.relativePath;
            body.canvas_content = ctx.canvasData;

            if (ctx.canvasData?.nodes && ctx.canvasData.nodes.length > 0) {
                const embeddedImages = await getEmbeddedImagesFromColoredNodes(
                    ctx.view.app.vault,
                    ctx.canvasData
                );
                if (embeddedImages.length > 0) {
                    console.log("Sending images: ", embeddedImages.length); 
                    new Notice(`Found ${embeddedImages.length} - API.`);
                    body.embedded_images = embeddedImages;
                }
                else {
                    console.log("No images found"); 
                    new Notice("From API - No images");
                }
            }
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
