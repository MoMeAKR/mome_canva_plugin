import { Plugin } from "obsidian";

export interface ToolItem {
    title: string;
    content: string;
}

export interface ApiMessageResponse {
    message: string;
}

export type Direction = "top" | "bottom" | "left" | "right";

export interface MomePluginSettings {
    baseUrl: string;
}

export const DEFAULT_SETTINGS: MomePluginSettings = {
    baseUrl: 'http://localhost:8000'
};

// Interface to decouple features from the concrete main class
export interface IMomePlugin extends Plugin {
    settings: MomePluginSettings;
    saveSettings(): Promise<void>;
}


