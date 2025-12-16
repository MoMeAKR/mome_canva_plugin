//src/commands/state-modal-commands.ts

import { Notice } from "obsidian";
import { IMomePlugin } from "../types";
import { UrlModal } from "../modals/url-modal";

export function registerStateModalCommands(plugin: IMomePlugin) {
    plugin.addCommand({
        id: 'update-api-url',
        name: 'Update API Base URL',
        callback: () => {
            new UrlModal(plugin.app, plugin.settings.baseUrl, async (result) => {
                // Remove trailing slash if user added one
                const cleanUrl = result.replace(/\/$/, "");
                
                plugin.settings.baseUrl = cleanUrl;
                await plugin.saveSettings();
                new Notice(`API URL saved: ${cleanUrl}`);
            }).open();
        }
    });
}


