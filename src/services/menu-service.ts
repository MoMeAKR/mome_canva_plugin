import { Menu } from "obsidian";
import { ToolItem } from "../types";

export function showToolMenu(
    evt: MouseEvent, 
    items: ToolItem[], 
    onSelect: (item: ToolItem) => void
) {
    const menu = new Menu();
    items.forEach((itemData) => {
        menu.addItem((item) => {
            item.setTitle(itemData.title);
            item.onClick(() => onSelect(itemData));
        });
    });
    menu.showAtMouseEvent(evt);
}


