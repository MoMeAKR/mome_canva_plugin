import { Plugin } from "obsidian";
import { CANVAS_COLORS } from "../constants";
import { getCanvasContext, setCanvasNodeColor } from "../utils/canva-utils";

let currentColorIndex = 0;

export function registerColorCommands(plugin: Plugin) {
    const app = plugin.app;

    plugin.addCommand({
        id: 'cycle-canvas-node-color',
        name: 'Cycle canvas node color',
        hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if (ctx) {
                if (!checking) {
                    const color = CANVAS_COLORS[currentColorIndex];
                    currentColorIndex = (currentColorIndex + 1) % CANVAS_COLORS.length;
                    setCanvasNodeColor(ctx.canvas, color);
                }
                return true;
            }
            return false;
        }
    });

    plugin.addCommand({
        id: 'clear-canvas-node-color',
        name: 'Clear canvas node color',
        hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
        checkCallback: (checking) => {
            const ctx = getCanvasContext(app);
            if (ctx) {
                if (!checking) setCanvasNodeColor(ctx.canvas, null);
                return true;
            }
            return false;
        }
    });

    const colors = [
        { id: '1', name: 'red' }, { id: '2', name: 'orange' },
        { id: '3', name: 'yellow' }, { id: '4', name: 'green' },
        { id: '5', name: 'cyan' }, { id: '6', name: 'purple' },
    ];

    colors.forEach(c => {
        plugin.addCommand({
            id: `set-canvas-node-${c.name}`,
            name: `Selected canvas node color to ${c.name}`,
            checkCallback: (checking) => {
                const ctx = getCanvasContext(app);
                if (ctx) {
                    if (!checking) setCanvasNodeColor(ctx.canvas, c.id);
                    return true;
                }
                return false;
            }
        });
    });
}


