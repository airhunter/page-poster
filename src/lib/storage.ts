import { isPosterStyle, type ExtensionSettings, type GenerationTask } from "../types";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "",
  posterStyle: "swiss",
};

export function taskStorageKey(tabId: number): string {
  return `page-poster:task:${tabId}`;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get("settings");
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings as Partial<ExtensionSettings> | undefined),
  };
  return {
    ...settings,
    posterStyle: isPosterStyle(settings.posterStyle) ? settings.posterStyle : "swiss",
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({ settings });
}

export async function getTask(tabId: number): Promise<GenerationTask | undefined> {
  const key = taskStorageKey(tabId);
  const stored = await browser.storage.session.get(key);
  return stored[key] as GenerationTask | undefined;
}

export async function saveTask(task: GenerationTask): Promise<void> {
  await browser.storage.session.set({ [taskStorageKey(task.tabId)]: task });
}

export async function removeTask(tabId: number): Promise<void> {
  await browser.storage.session.remove(taskStorageKey(tabId));
}
