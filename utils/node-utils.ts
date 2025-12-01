import { Canvas, CanvasData, CanvasTextData, CanvasFileData } from "obsidian/canvas";
import { Notice } from "obsidian";

export const addNode = (canvas: Canvas, id: string, config: {
    x: number, y: number, width: number, height: number,
    type: 'text' | 'file', content: string, subpath?: string,
}) => {
    if (!canvas) return;
    const data = canvas.getData();
    if (!data) return;

    const node: Partial<CanvasTextData | CanvasFileData> = {
        id, x: config.x, y: config.y, width: config.width, height: config.height, type: config.type,
    };

    if (config.type === 'text') (node as CanvasTextData).text = config.content;
    if (config.type === 'file') {
        (node as CanvasFileData).file = config.content;
        if (config.subpath) (node as CanvasFileData).subpath = config.subpath;
    }

    canvas.importData({
        nodes: [...data.nodes, node],
        edges: data.edges,
    } as CanvasData);

    canvas.requestFrame();
    return node;
};

export async function copyNodeIdToClipboard(node: any): Promise<void> {
    if (!node.id) return;
    await navigator.clipboard.writeText(node.id);
    new Notice(`Copied node id: ${node.id}`);
}

export function createNodeAtViewportCenter(canvas: Canvas, content: string): any {
    const nodeWidth = 200;
    const nodeHeight = 80;
    const x = canvas.x - nodeWidth / 2;
    const y = canvas.y - nodeHeight / 2;
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);

    const addedNode = addNode(canvas, id, {
        x, y, width: nodeWidth, height: nodeHeight, type: "text", content,
    });

    const actualNode = Array.from(canvas.nodes.values()).find((n: any) => n.id === id);
    if (actualNode) {
        requestAnimationFrame(() => (actualNode as any).startEditing());
        canvas.requestSave();
        new Notice("New node created at center!");
        return actualNode;
    }

    return addedNode;
}
