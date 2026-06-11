//src/commands/state-modal-commands.ts

import { Notice } from "obsidian";
import { IMomePlugin } from "../types";
import { UrlModal } from "../modals/url-modal";
import { writeSharedConfig } from "../shared/shared-config";

export function registerStateModalCommands(plugin: IMomePlugin) {
  plugin.addCommand({
    id: "update-api-url",
    name: "Update API Base URL",
    callback: () => {
      new UrlModal(plugin.app, plugin.settings.baseUrl, async (result) => {
        const cleanUrl = result.replace(/\/$/, "");

        plugin.settings.baseUrl = cleanUrl;
        await plugin.saveSettings();

        // NEW: write shared file for other plugins
        await writeSharedConfig(plugin.app, { baseUrl: cleanUrl });

        new Notice(`API URL saved: ${cleanUrl}`);
      }).open();
    },
  });
}
