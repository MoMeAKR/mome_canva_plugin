import { Plugin, ItemView, Notice, TFile } from "obsidian";
import { Canvas, CanvasNodeData, CanvasData, CanvasTextData, CanvasFileData} from "obsidian/canvas";



const apiUrl = 'http://localhost:8000/LaToile';
const CANVAS_COLORS = [
	'1', // Red
	'2', // Orange  
	'3', // Yellow
	'4', // Green
	'5', // Cyan
	'6', // Purple
];

let currentColorIndex = 0;

export const random = (length: number) => {
    let str = "";
    for (let i = 0; i < length; i++) {
        str += (16 * Math.random() | 0).toString(16);
    }
    return str;
};



export const addNode = (canvas: Canvas, id: string, {
	x,
	y,
	width,
	height,
	type,
	content,
	subpath,
}: {
	x: number,
	y: number,
	width: number,
	height: number,
	type: 'text' | 'file',
	content: string,
	subpath?: string,
}) => {
	if (!canvas) return;

	const data = canvas.getData();
	if (!data) return;

	const node: Partial<CanvasTextData | CanvasFileData> = {
		"id": id,
		"x": x,
		"y": y,
		"width": width,
		"height": height,
		"type": type,
	};

	switch (type) {
		case 'text':
			node.text = content;
			break;
		case 'file':
			node.file = content;
			if (subpath) node.subpath = subpath;
			break;
	}

	canvas.importData(<CanvasData>{
		"nodes": [
			...data.nodes,
			node],
		"edges": data.edges,
	});

	canvas.requestFrame();

	return node;
};


export const getLastNode = (canvas: Canvas) => {
	const nodesArray = Array.from(canvas.nodes.values());
	if (nodesArray.length > 0) {
		return nodesArray[nodesArray.length - 1];
	}
	return null;
};

export default class mOmE_Canva extends Plugin {

	async onload() {
		console.log("=== mOmE_Canva plugin loaded ===");

		// Cycle through canvas node colors
		this.addCommand({
			id: 'cycle-canvas-node-color',
			name: 'Cycle canvas node color',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
			checkCallback: (checking: boolean) => {
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView?.canvas;
						const selection = canvas.selection;
						
						if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode && lastNode.setColor) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor(nextColor, true);
								canvas.requestSave();
							}
							return;
						}

						const nextColor = CANVAS_COLORS[currentColorIndex];
						currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;

						selection.forEach((node: any) => {
							if (node.setColor) {
								node.setColor(nextColor, true);
							}
						});

						canvas.requestSave();
					}
					return true;
				}
				return false;
			}
		});

		// Clear canvas node color
		this.addCommand({
			id: 'clear-canvas-node-color',
			name: 'Clear canvas node color',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
			checkCallback: (checking: boolean) => {
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView?.canvas;
						const selection = canvas.selection;
						
						if (selection.size === 0) return;

						selection.forEach((node: any) => {
							if (node.setColor) {
								node.setColor(null, true);
							}
						});

						canvas.requestSave();
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
		id: 'set-canvas-node-green',
		name: 'Selected canvas node color to green',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("4", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('4', true); // Green
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});
	this.addCommand({
		id: 'set-canvas-node-red',
		name: 'Selected canvas node color to red',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("1", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('1', true); // Red
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});
	this.addCommand({
		id: 'set-canvas-node-orange',
		name: 'Selected canvas node color to orange',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("2", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('2', true); // Orange
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});
	this.addCommand({
		id: 'set-canvas-node-yellow',
		name: 'Selected canvas node color to yellow',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("3", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('3', true); // yellow
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});

	this.addCommand({
		id: 'set-canvas-node-cyan',
		name: 'Selected canvas node color to cyan',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("5", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('5', true); // Cyan
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});

	this.addCommand({
		id: 'set-canvas-node-purple',
		name: 'Selected canvas node color to purple',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;

					if (selection.size === 0) {
							const lastNode = getLastNode(canvas);
							if (lastNode) {
								const nextColor = CANVAS_COLORS[currentColorIndex];
								currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
								lastNode.setColor("6", true);
								canvas.requestSave();
							}
							return;
						}
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('6', true); // Purple
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});


	this.addCommand({
		id: 'open-canva-node',
		name: 'Opens canva node at screen center',
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					const selection = canvas.selection;
					
					selection.forEach((node: any) => {
						if (node.setColor) {
							node.setColor('6', true); // Purple
						}
					});
					canvas.requestSave();
				}
				return true;
			}
			return false;
		}
	});

	

	this.addCommand({
			id: 'execute_LaToile',
			name: 'Execute LaToile on current canva',
			callback: async () => {
				await this.sendCanvasPath();
			}
		});

	this.addCommand({
			id: 'create-new-canva-node',
			name: 'Create-new-canva-node',
			hotkeys: [{ modifiers: ['Mod'], key: 'h' }],
			callback: async () => {
				this.createNewCanvasNode();
			}
		});

	}

private createNewCanvasNode(): void {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
    if (!canvasView || canvasView.getViewType() !== "canvas") {
        new Notice('Not in a canvas view');
        return;
    }

    // @ts-ignore
    const canvas: Canvas = canvasView.canvas;

    const nodeWidth = 300;
    const nodeHeight = 200;

    let x = 0;
    let y = 0;

	// Position the new node relative to the last node (if any)
	const nodesArray = Array.from(canvas.nodes.values());
	if (nodesArray.length > 0) {
		const lastNode = nodesArray[nodesArray.length - 1];
		x = lastNode.x + lastNode.width + 50; // 50px gap
		y = lastNode.y;
	}

    // Generate a unique ID for the new node
    const id = crypto.randomUUID();

    // Add the node using your addNode function
    addNode(canvas, id, {
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        type: 'text',
        content: 'New Node',
    });

    // Retrieve the actual node from the canvas
    // @ts-ignore
    const actualNode = Array.from(canvas.nodes.values()).find(n => n.id === id);

    if (!actualNode) {
        new Notice("Failed to create node");
        console.error("Could not find node after adding:", id);
        return;
    }

    // Select and zoom to the new node
    canvas.selection.clear();
    canvas.selection.add(actualNode);
    canvas.zoomToSelection();

    // Start editing
    requestAnimationFrame(() => actualNode.startEditing());

    canvas.requestSave();
    new Notice('New node created!');
    console.log("Created new node:", actualNode);
}


	private async sendCanvasPath(): Promise<void> {
		const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
		if (canvasView?.getViewType() !== "canvas") {
			new Notice('Not in a canvas view');
			return;
		}

		// @ts-ignore
		const canvasFile = canvasView?.file;
		if (!canvasFile) {
			new Notice('No canvas file found');
			return;
		}

		const canvasPath = this.app.vault.adapter.getFullPath(canvasFile.path);
		
		try {
			
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					canvas_path: canvasPath 
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			new Notice(`Python response: ${result.message}`);
			
		} catch (error) {
			new Notice(canvasPath);
			console.error('Error:', error);
		}

	}
}