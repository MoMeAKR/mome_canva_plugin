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

export function setCanvasNodeColor(canvas: Canvas, colorId: string | null) {
    const selection = canvas.selection;
    const applyColor = (node: any) => {
        if (node.setColor) node.setColor(colorId, true);
    };

    if (selection.size === 0) {
        const lastNode = getLastNode(canvas);
        if (lastNode) applyColor(lastNode);
    } else {
        selection.forEach(applyColor);
    }
    canvas.requestSave();
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