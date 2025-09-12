// //check syntax here https://github.com/Quorafind/Obsidian-Canvas-MindMap

import { Plugin, ItemView, Notice, TFile, Menu } from "obsidian";
import { Canvas, CanvasNodeData, CanvasData, CanvasTextData, CanvasFileData, CanvasNode} from "obsidian/canvas";



const apiUrl = 'http://localhost:8000/LaToile';
const apiCodeUrl = 'http://localhost:8000/cOdEaRtIsT';
const apiCodeTools = "http://localhost:8000/cOdEaRtIsT/get_tools";
const getToolStringContentAPI = "http://localhost:8000/cOdEaRtIsT/get_node_content";
const LaToileToolsAPI = "http://localhost:8000/LaToile/all_tools_heuristics";
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
    candidates.sort((a: any, b: any) => {
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

async function copyNodeIdToClipboard(node: CanvasNode): Promise<void> {
    const id = node.id;
    if (!id) {
        console.warn("Node does not have an id.");
        return;
    }

    await navigator.clipboard.writeText(id);
	new Notice(`Copied node id to clipboard: ${id}`);
}




export default class mOmE_Canva extends Plugin {

	async onload() {
		console.log("=== mOmE_Canva plugin loaded ===");

		this.addRibbonIcon("bolt", "Execute LaToile", async () => {
            await this.sendCanvasPath();
        });

		this.addRibbonIcon("bomb", "CodeArtist Exec", async () => {
			await this.SendCanvasToCodeArtist();
		});

		this.addRibbonIcon("box", "CodeArtist Tools", async (evt: MouseEvent) => {
			await this.openCodeArtistMenu(evt);
		});

		this.addRibbonIcon("wand", "Transform tool node (codeartist)", async () => {
			await this.updateCodeToolFromString();
		});

		this.addRibbonIcon("book", "LaToile Tools", async (evt: MouseEvent) => {
			await this.openLaToileTools(evt);
		});


		this.addCommand({
			id: 'update-codeartist-tool-from-string',
			name: 'CodeArtist Tool Transform',
			// hotkeys: [{ modifiers: ['Mod'], key: 'T' }],
			checkCallback: (checking: boolean) => {
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === "canvas") {
					if (!checking) {
						this.updateCodeToolFromString();
					}
					return true;
				}
				return false;
			}
		});
	


		// Adding navigation commands 
		this.AddNavCommands(); 

		// Node to clipboard
		this.addCommand({
            id: 'm0me-copy-node-id',
            name: 'Copy selected node ID to clipboard',
            hotkeys: [{ modifiers: ['Alt'], key: 'c' }],
            checkCallback: (checking: boolean) => {
                const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
                if (canvasView?.getViewType() === "canvas") {
                    if (!checking) {
                        // @ts-ignore
                        const canvas = canvasView?.canvas;
                        const selection = canvas.selection;
                        if (selection.size === 1) {
                            const node = selection.values().next().value;
                            copyNodeIdToClipboard(node);
                        }
                    }
                    return true;
                }
                return false;
            }
        });

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
							const lastNode = getLastNode(canvas) as any;
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
			id: 'execute_cOdEaRtIsT',
			name: 'CodeArtist graph computation ',
			callback: async () => {
				await this.SendCanvasToCodeArtist();
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

// a function that is activated by the command, targetting the currently selected node. Sends content to API (/cOdEaRtIsT/get_node_content), receives contents to include in the node 
private async updateCodeToolFromString(): Promise<void> {
	const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
	if (!canvasView || canvasView.getViewType() !== "canvas") {
		new Notice("Not in a canvas view");
		return;
	}

	// @ts-ignore
	const canvas: Canvas = canvasView.canvas;
	const selection = canvas.selection;

	if (selection.size !== 1) {
		new Notice("Please select a single node");
		return;
	}

	const node = selection.values().next().value;
	let nodeContent = node.text?.trim();
	
	try {
		const response = await fetch(getToolStringContentAPI, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ target: nodeContent })
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		
		node.text = result.content; 
		canvas.requestFrame(); // Automated refresh after updating node content
		canvas.requestSave();
		new Notice("Node content updated from API.");
	} catch (error) {
		console.error("Failed to update node content:", error);
		new Notice("Failed to update node content.");
	}
}


private async openCodeArtistMenu(evt: MouseEvent) {
        console.log("[CodeArtist] Fetching menu items...");

        // Fetch items from your API
        let items: { title: string; content: string }[] = [];
        try {
            const response = await fetch(apiCodeTools);
			console.log(response);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            items = await response.json(); // expected: [{title, content}, ...]
            console.log("[mOmE] menu items fetched:", items);
        } catch (error) {
            console.error("[mOmE] Failed to fetch menu items:", error);
            new Notice("Failed to fetch menu items");
            return;
        }

        // Build menu dynamically
        const menu = new Menu();
        items.forEach((itemData) => {
            menu.addItem((item) => {
                item.setTitle(itemData.title);
                item.onClick(() => {
                    console.log(`[mOmE] Menu item clicked: ${itemData.title}`);
                    this.createNewToolCanvasNode(itemData.content);
                });
            });
        });

        menu.showAtMouseEvent(evt);
    }

	
private async openLaToileTools(evt?: MouseEvent) {
    console.log("[LaToile] Fetching tools and heuristics...");

    // Ensure we're in a canvas view
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

    // Get the full path to the canvas file
    const dataPath = (this.app.vault.adapter as any).getFullPath(canvasFile.path);
    

    let items: { title: string; content: string }[] = [];
    try {
        // Use POST with JSON body
        const response = await fetch(LaToileToolsAPI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ canvas_path: dataPath })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Combine heuristics and tools into a single list for the menu
        items = (data.tools || []).map((t: any) => ({
            title: t.name,
            content: t.desc
        }));
        console.log("[LaToile] Menu items fetched:", items);
    } catch (error) {
        console.error("[LaToile] Failed to fetch tools/heuristics:", error);
        new Notice("Failed to fetch LaToile tools/heuristics");
        return;
    }

    // Build and show the menu
    const menu = new Menu();
    items.forEach((itemData) => {
        menu.addItem((item) => {
            item.setTitle(itemData.title);
            item.onClick(async () => {
                console.log(`[LaToile] Menu item clicked: ${itemData.title}`);
                this.createNewToolCanvasNode(itemData.title);
                this.setCanvasNodeColor(canvasView, "6"); // Purple
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.sendCanvasPath();
            });
        });
    });

    // Show menu at mouse event location if available, else at center
	menu.showAtMouseEvent(evt);
    // if (evt) {
        
    // } else {
    //     menu.showAtPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    // }
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
			const lastNode = getLastNode(canvas) as any; 
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





private createNewToolCanvasNode(content: string): void {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
    if (!canvasView || canvasView.getViewType() !== "canvas") {
        new Notice("Not in a canvas view");
        return;
    }

    // @ts-ignore
    const canvas: Canvas = canvasView.canvas;

    const nodeWidth = 450;
    const nodeHeight = 250;

    // Compute center of the visible canvas viewport
    // const x = canvas.x + canvas.canvasRect.width / 2 - nodeWidth / 2;
    // const y = canvas.y + canvas.canvasRect.height / 2 - nodeHeight / 2;
	const x = canvas.x - nodeWidth / 2;
	const y = canvas.y - nodeHeight / 2;


	const id = crypto.randomUUID();

    // @ts-ignore
    addNode(canvas, id, {
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        type: "text",
        content,
    });

    // Retrieve actual node
    // @ts-ignore
    const actualNode = Array.from(canvas.nodes.values()).find((n) => n.id === id);
    if (!actualNode) {
        new Notice("Failed to create node");
        console.error("Could not find node after adding:", id);
        return;
    }

    // Start editing immediately
    requestAnimationFrame(() => (actualNode as any).startEditing());
    canvas.requestSave();
    new Notice("New node created at viewport center!");
    console.log("Created new node:", actualNode);
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
	const nodesArray = Array.from(canvas.nodes.values()) as any;
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
    // requestAnimationFrame(() => actualNode.startEditing());
	requestAnimationFrame(() => (actualNode as any).startEditing());

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

		const canvasPath = (this.app.vault.adapter as any).getFullPath(canvasFile.path);
		
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


	private async SendCanvasToCodeArtist(): Promise<void> {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);

		// Ensure it’s a canvas
		if (canvasView?.getViewType() !== "canvas") {
			new Notice('Not in a canvas view');
			return;
		}

		// File exists (TS-safe)
		// Use 'as any' since TS doesn't know canvasView.file
		const canvasFile = (canvasView as any)?.file;
		if (!canvasFile) {
			new Notice('No canvas file found');
			return;
		}

		// Get full path from vault adapter (TS-safe)
		const canvasPath = (this.app.vault.adapter as any).getFullPath(canvasFile.path);

		// Access canvas instance (TS-safe)
		const canvas = (canvasView as any)?.canvas;
		const currentSelection_ids = Array.from(canvas.selection).map((sel: { id: string }) => sel.id);
    
		console.log('Current selection:', canvas.selection);
		console.log('Selection IDs:', currentSelection_ids);
		try {
			
			const response = await fetch(apiCodeUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					canvas_path: canvasPath, 
					selected_node_ids: currentSelection_ids
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
