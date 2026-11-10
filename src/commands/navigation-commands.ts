import { Plugin } from "obsidian";
import { getCanvasContext, navigateCanvas } from "../utils/canva-utils";
import { Direction } from "../types";

export function registerNavigationCommands(plugin: Plugin) {
    const directions: Direction[] = ["top", "bottom", "left", "right"];
    
    const dirMap: Record<Direction, string> = {
        top: "ArrowUp", bottom: "ArrowDown", left: "ArrowLeft", right: "ArrowRight"
    };

    const dirName: Record<Direction, string> = {
        top: "above", bottom: "below", left: "on the left", right: "on the right"
    };

    directions.forEach(dir => {
        plugin.addCommand({
            id: `m0me-navigate-${dir}`,
            name: `Maps to node ${dirName[dir]}`,
            hotkeys: [{ modifiers: ['Alt'], key: dirMap[dir] }],
            checkCallback: (checking) => {
                const ctx = getCanvasContext(plugin.app);
                if (ctx) {
                    if (!checking) navigateCanvas(ctx.canvas, dir);
                    return true;
                }
                return false;
            }
        });
    });
}


