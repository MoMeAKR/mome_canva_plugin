// features/commons.ts

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
