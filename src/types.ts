//types.ts
import { App, Command, EventRef, Plugin } from "obsidian";
import { CanvasToolbar } from "./features/canvasToolbar"; 
import { BusyIndicator } from "./features/busy-indicator";

export interface ToolItem {
    title: string;
    content: string;
}

export interface ApiMessageResponse {
    message: string;
}

export type Direction = "top" | "bottom" | "left" | "right";

export interface NamedApiUrl {
    name: string;
    url: string;
}

export interface MomePluginSettings {
    baseUrl: string;
    savedApiUrls: NamedApiUrl[];
}

export const DEFAULT_SETTINGS: MomePluginSettings = {
    baseUrl: "http://localhost:8000",
    savedApiUrls: []
};

// Interface to decouple features from the concrete main class
export interface IMomePlugin extends Plugin {
    settings: MomePluginSettings;
    busyIndicator: BusyIndicator;
    app: App;
    canvasToolbar?: CanvasToolbar;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
    addCommand(command: Command): Command;
    registerEvent(event: EventRef): void;
}