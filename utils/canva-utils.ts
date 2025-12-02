// src/utils/canva-utils.ts 

import { App, ItemView, TFile } from "obsidian";
import { Canvas, CanvasNode } from "obsidian/canvas";
import { Direction } from "../types";

export interface CanvasContext {
    view: ItemView;
    canvas: Canvas;
    file: TFile;
    absolutePath: string;
    relativePath: string;
    canvasData: any;
}


export interface JsonFenceMatch {
    start: number;
    end: number;
    header: string;
    inner: string;
    closing: string;
}

export function findJsonFence(text: string): JsonFenceMatch | null {
    // Header captures ```json[...] and the newline (if present)
    // Inner captures everything until the closing fence
    // Closing captures the closing ``` (with optional leading newline)
    const re = /(```\s*jsonc?\b[^\n]*\r?\n?)([\s\S]*?)(\r?\n?```)/i;
    const m = re.exec(text);
    if (!m) return null;
    const [full, header, inner, closing] = m;
    const start = m.index;
    const end = start + full.length;
    return { start, end, header, inner, closing };
}



export function getCanvasContext(app: App): CanvasContext | null {
    const view = app.workspace.getActiveViewOfType(ItemView);
    if (view?.getViewType() !== "canvas") return null;
    
    const canvas = (view as any).canvas as Canvas;
    const file = (view as any).file as TFile;

    if (!file || !canvas) return null;
    
    return { 
        view, 
        canvas, 
        file, 
        absolutePath: (app.vault.adapter as any).getFullPath(file.path),
        relativePath: file.path, 
        canvasData: canvas.getData() 
    };
}

export function getLastNode(canvas: Canvas) {
    const nodesArray = Array.from(canvas.nodes.values());
    return nodesArray.length > 0 ? nodesArray[nodesArray.length - 1] : null;
}

export function setCanvasNodeColor(canvas: Canvas, colorId: string | null, node?: CanvasNode | null) {
    const applyColor = (n: any) => {
        if (n?.setColor) n.setColor(colorId, true);
    };

    if (node) {
        applyColor(node);
    } else {
        const selection = canvas.selection;
        if (selection.size === 0) {
            const lastNode = getLastNode(canvas);
            if (lastNode) applyColor(lastNode);
        } else {
            selection.forEach(applyColor);
        }
    }

    canvas.requestSave();
}

function isTextNode(node: CanvasNode): boolean {
    const anyNode = node as any;
    return anyNode?.type === "text" || typeof anyNode?.text === "string";
}

export function getSelectedOrLastTextNode(canvas: Canvas): CanvasNode | null {
    const selection = canvas.selection as Set<CanvasNode>;

    // Prefer a selected text node
    if (selection && selection.size > 0) {
        for (const n of selection) {
            if (isTextNode(n)) return n;
        }
        // If selection exists but has no text nodes, we won’t edit JSON
        return null;
    }

    // Fallback: last text node among all nodes
    const nodesArray = Array.from(canvas.nodes.values());
    for (let i = nodesArray.length - 1; i >= 0; i--) {
        const n = nodesArray[i];
        if (isTextNode(n)) return n;
    }
    return null;
}

export function setTextNodeText(canvas: Canvas, node: CanvasNode, text: string) {
    if (!node) return;

    // Prefer a method if it exists (on some canvas builds)
    if (typeof (node as any).setText === "function") {
        (node as any).setText(text);
    } else {
        (node as any).text = text;
    }

    // If available, let the node recompute its size
    if (typeof (node as any).resizeToFit === "function") {
        try { (node as any).resizeToFit(); } catch {}
    }

    // Nudge selection to force visual refresh
    if (typeof canvas.selectOnly === "function") {
        try {
            const wasSelected = (canvas.selection as Set<any>)?.has(node);
            if (!wasSelected) {
                canvas.selectOnly(node);
                // optional: restore selection after frame if you don’t want it selected
                setTimeout(() => {
                    if (typeof canvas.deselectAll === "function") canvas.deselectAll();
                }, 0);
            }
        } catch {}
    }

    // Force redraw and persist
    canvas.requestFrame?.();
    canvas.requestSave?.();
}



export const navigateCanvas = (canvas: Canvas, direction: Direction) => {
    const currentSelection = canvas.selection;
    if (currentSelection.size !== 1) return;

    const selectedItem = currentSelection.values().next().value as CanvasNode;
    const { x, y, width, height } = selectedItem;

    canvas.deselectAll();
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const filterOutGroups = (node: CanvasNode) => !('label' in node);
    
    const isInDirection = (node: CanvasNode) => {
        const nx = node.x + node.width / 2;
        const ny = node.y + node.height / 2;
        switch (direction) {
            case "top": return ny < centerY;
            case "bottom": return ny > centerY;
            case "left": return nx < centerX;
            case "right": return nx > centerX;
        }
    };

    const getDistance = (node: CanvasNode) => {
        const nx = node.x + node.width / 2;
        const ny = node.y + node.height / 2;
        const dx = Math.abs(nx - centerX);
        const dy = Math.abs(ny - centerY);
        return (direction === "top" || direction === "bottom") ? [dy, dx] : [dx, dy];
    };

    const candidates = canvas.getViewportNodes().filter(filterOutGroups).filter(isInDirection);
    candidates.sort((a: any, b: any) => {
        const [a1, a2] = getDistance(a);
        const [b1, b2] = getDistance(b);
        return a1 !== b1 ? a1 - b1 : a2 - b2;
    });

    const nextNode = candidates[0];
    if (nextNode) canvas.selectOnly(nextNode);
};