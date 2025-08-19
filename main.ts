// //check syntax here https://github.com/Quorafind/Obsidian-Canvas-MindMap

import { Plugin, ItemView, Notice, TFile } from "obsidian";
import { Canvas, CanvasNodeData, CanvasData, CanvasTextData, CanvasFileData, CanvasNode} from "obsidian/canvas";



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


const navigate = (canvas: Canvas, direction: string) => {
    const currentSelection = canvas.selection;
    if (currentSelection.size !== 1) return;

    const selectedItem = currentSelection.values().next().value as CanvasNode;
    const viewportNodes = canvas.getViewportNodes();
    const { x, y, width, height } = selectedItem;

    canvas.deselectAll();

    // Helper: Exclude group nodes (those with a 'label' key)
    const filterOutGroups = (node: CanvasNode) => !('label' in node);

    // Center of the selected node
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Directional filter: only nodes in the intended direction
    const isInDirection = (node: CanvasNode) => {
        const nodeCenterX = node.x + node.width / 2;
        const nodeCenterY = node.y + node.height / 2;
        switch (direction) {
            case "top":    return nodeCenterY < centerY;
            case "bottom": return nodeCenterY > centerY;
            case "left":   return nodeCenterX < centerX;
            case "right":  return nodeCenterX > centerX;
            default:       return false;
        }
    };

    // Compute distance in the intended direction
    const getDistance = (node: CanvasNode) => {
        const nodeCenterX = node.x + node.width / 2;
        const nodeCenterY = node.y + node.height / 2;
        switch (direction) {
            case "top":
            case "bottom":
                // Primary: vertical distance, Secondary: horizontal distance
                return [
                    Math.abs(nodeCenterY - centerY),
                    Math.abs(nodeCenterX - centerX)
                ];
            case "left":
            case "right":
                // Primary: horizontal distance, Secondary: vertical distance
                return [
                    Math.abs(nodeCenterX - centerX),
                    Math.abs(nodeCenterY - centerY)
                ];
            default:
                return [Infinity, Infinity];
        }
    };

    // Filter out group nodes and nodes not in the intended direction
    const candidates = viewportNodes
        .filter(filterOutGroups)
        .filter(isInDirection);

    // Sort by primary axis distance, then by secondary axis distance
    candidates.sort((a, b) => {
        const [aPrimary, aSecondary] = getDistance(a);
        const [bPrimary, bSecondary] = getDistance(b);
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;
        return aSecondary - bSecondary;
    });

    const nextNode = candidates[0];

    if (nextNode) {
        canvas.selectOnly(nextNode);
        // canvas.zoomToSelection();
    }

    return nextNode;
};



export default class mOmE_Canva extends Plugin {

	async onload() {
		console.log("=== mOmE_Canva plugin loaded ===");

		// Adding navigation commands 
		this.AddNavCommands(); 

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
					this.setCanvasNodeColor(canvasView, "4"); // green
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
					this.setCanvasNodeColor(canvasView, "1"); // Red
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
					this.setCanvasNodeColor(canvasView, "2"); // Orange
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
					this.setCanvasNodeColor(canvasView, "3"); // Yellow
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
					this.setCanvasNodeColor(canvasView, "5"); // Cyan
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
					this.setCanvasNodeColor(canvasView, "6"); // Purple
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
		id: "execute_heuristic", 
		name: "Current selection (or last) node to orange and execution", 
		callback: async () => {
			console.log("hello")
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				this.setCanvasNodeColor(canvasView, "2"); // Orange
				await new Promise(resolve => setTimeout(resolve, 2000));
				await this.sendCanvasPath();
			}
		}
	});

	this.addCommand({
		id: "execute_tool", 
		name: "Current selection (or last) node to red and execution", 
		callback: async () => {
			console.log("hello")
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				this.setCanvasNodeColor(canvasView, "1"); // Orange
				await new Promise(resolve => setTimeout(resolve, 2000));
				await this.sendCanvasPath();
			}
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

	this.addCommand({
            id: 'm0me-start-editing',
            name: 'Start editing selected node',
            hotkeys: [{ modifiers: ['Mod'], key: 'E' }],
            checkCallback: (checking: boolean) => {
                const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
                if (canvasView?.getViewType() === "canvas") {
                    if (!checking) {
                        // @ts-ignore
                        const canvas = canvasView?.canvas;
                        const selection = canvas.selection;
                        if (selection.size === 1) {
                            const node = selection.values().next().value;
                            if (!node.isEditing) {
                                node.startEditing();
                            }
                        }
                    }
                    return true;
                }
                return false;
            }
        });

	}
AddNavCommands(){
	// UP
	this.addCommand({
		id: 'm0me-navigate-up',
		name: 'Navigate to node above',
		hotkeys: [{ modifiers: ['Alt'], key: 'ArrowUp' }],
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					navigate(canvas, "top");
				}
				return true;
			}
			return false;
		}
	});

	// LEFT
    this.addCommand({
		id: 'm0me-navigate-down',
		name: 'Navigate to node below',
		hotkeys: [{ modifiers: ['Alt'], key: 'ArrowDown' }],
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					navigate(canvas, "bottom");
				}
				return true;
			}
			return false;
		}
	});

	// LEFT
        this.addCommand({
            id: 'm0me-navigate-left',
            name: 'Navigate to node on the left',
            hotkeys: [{ modifiers: ['Alt'], key: 'ArrowLeft' }],
            checkCallback: (checking: boolean) => {
                const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
                if (canvasView?.getViewType() === "canvas") {
                    if (!checking) {
                        // @ts-ignore
                        const canvas = canvasView?.canvas;
                        navigate(canvas, "left");
                    }
                    return true;
                }
                return false;
            }
    });
	// RIGHT
	this.addCommand({
		id: 'm0me-navigate-right',
		name: 'Navigate to node on the right',
		hotkeys: [{ modifiers: ['Alt'], key: 'ArrowRight' }],
		checkCallback: (checking: boolean) => {
			const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
			if (canvasView?.getViewType() === "canvas") {
				if (!checking) {
					// @ts-ignore
					const canvas = canvasView?.canvas;
					navigate(canvas, "right");
				}
				return true;
			}
			return false;
		}
	});
}


private setCanvasNodeColor(
		canvasView: ItemView | null,
		colorId: string
	): void {
		if (!canvasView || canvasView.getViewType() !== "canvas") return;

		// @ts-ignore
		const canvas = canvasView.canvas;
		const selection = canvas.selection;

		if (selection.size === 0) {
			const lastNode = getLastNode(canvas); 
			if (lastNode && lastNode.setColor) {
				lastNode.setColor(colorId, true);
				canvas.requestSave();
			}
			return;
		}

		selection.forEach((node: any) => {
			if (node.setColor) {
				node.setColor(colorId, true);
			}
		});
		canvas.requestSave();
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
