import { Plugin, ItemView, Notice } from 'obsidian';


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

export default class mOmE_Canva extends Plugin {

	async onload() {
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
						
						if (selection.size === 0) return;

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