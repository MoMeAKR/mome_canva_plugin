// src/shared/shared-config.ts (in plugin A)
import { App } from "obsidian";

export const SHARED_CONFIG_PATH = ".obsidian/mome-shared.json";

export type SharedConfig = {
  baseUrl?: string;
};

export async function writeSharedConfig(app: App, patch: SharedConfig) {
  const adapter = app.vault.adapter;

  let curr: SharedConfig = {};
  try {
    if (await adapter.exists(SHARED_CONFIG_PATH)) {
      const raw = await adapter.read(SHARED_CONFIG_PATH);
      curr = JSON.parse(raw) ?? {};
    }
  } catch {
    curr = {};
  }

  const next = { ...curr, ...patch };
  await adapter.write(SHARED_CONFIG_PATH, JSON.stringify(next, null, 2));
}

export async function readSharedConfig(app: App): Promise<SharedConfig> {
  const adapter = app.vault.adapter;
  if (!(await adapter.exists(SHARED_CONFIG_PATH))) return {};
  try {
    return JSON.parse(await adapter.read(SHARED_CONFIG_PATH)) ?? {};
  } catch {
    return {};
  }
}
