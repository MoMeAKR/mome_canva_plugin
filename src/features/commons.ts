// features/commons.ts
import { App, TFile, normalizePath } from "obsidian";

export interface ImagePayload {
  path: string;         // vault-relative path like "AppEngine Images/foo.webp"
  b64_image: string;    // raw base64 (no data: prefix)
}

export async function saveImagesByPath(app: App, images: ImagePayload[]): Promise<number> {
  let saved = 0;
  for (const img of images) {
    try {
      const filePath = toSafeVaultPath(img.path);
      if (!filePath) {
        console.warn("Skipping image with unsafe/empty path:", img?.path);
        continue;
      }
      await ensureContainingFolders(app, filePath);
      const bytes = decodeBase64ToBytes(img.b64_image);

      const existing = app.vault.getAbstractFileByPath(filePath);
      if (existing && existing instanceof TFile) {
        await app.vault.modifyBinary(existing, bytes);
      } else {
        await app.vault.createBinary(filePath, bytes);
      }
      saved++;
    } catch (err) {
      console.error("Failed to save image:", img?.path, err);
    }
  }
  return saved;
}

export function toSafeVaultPath(p: string): string | null {
  if (!p || typeof p !== "string") return null;
  let norm = normalizePath(p).replace(/^\/+/, "");
  const parts = norm.split("/").filter(seg => seg !== "" && seg !== "." && seg !== "..");
  norm = parts.join("/");
  return norm.length ? norm : null;
}

export async function ensureContainingFolders(app: App, filePath: string) {
  const idx = filePath.lastIndexOf("/");
  if (idx < 0) return;
  const folderPath = filePath.slice(0, idx);
  const segments = folderPath.split("/");
  let curr = "";
  for (const seg of segments) {
    curr = curr ? `${curr}/${seg}` : seg;
    const currNorm = normalizePath(curr);
    if (!(await app.vault.adapter.exists(currNorm))) {
      await app.vault.createFolder(currNorm);
    }
  }
}

export function decodeBase64ToBytes(b64: string): Uint8Array {
  if (!b64) return new Uint8Array();
  const clean = b64.replace(/\s+/g, "");
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    const buf = Buffer.from(clean, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const bin = atob(clean);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}


export function applyGraphUpdates(ctx: any, updates: any[]): number {
    let changesApplied = 0;

    updates.forEach((u: any) => {
        const op = u.op || 'update';

        // --- NODE OPERATIONS ---
        if (op === 'add') {
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
        // @ts-ignore
        ctx.canvas.requestFrame();
        // @ts-ignore
        ctx.canvas.requestSave();
    }
    return changesApplied;
}



