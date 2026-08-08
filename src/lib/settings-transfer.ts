import { isPosterStyle, type ExtensionSettings } from "../types";

export const SETTINGS_FILE_FORMAT = "page-poster-settings";
export const SETTINGS_SCHEMA_VERSION = 1;

interface SettingsFile {
  format: typeof SETTINGS_FILE_FORMAT;
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  exportedAt: string;
  settings: ExtensionSettings;
}

export function serializeSettingsFile(
  settings: ExtensionSettings,
  exportedAt = new Date(),
): string {
  const payload: SettingsFile = {
    format: SETTINGS_FILE_FORMAT,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    settings: normalizeSettings(settings),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function parseSettingsFile(source: string): ExtensionSettings {
  let payload: unknown;
  try {
    payload = JSON.parse(source);
  } catch {
    throw new Error("配置文件不是有效的 JSON");
  }

  if (!isRecord(payload) || payload.format !== SETTINGS_FILE_FORMAT) {
    throw new Error("这不是海报机导出的配置文件");
  }
  if (payload.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    throw new Error("暂不支持配置文件版本：" + String(payload.schemaVersion));
  }
  if (
    typeof payload.exportedAt !== "string" ||
    !payload.exportedAt ||
    Number.isNaN(Date.parse(payload.exportedAt))
  ) {
    throw new Error("配置文件缺少有效的导出时间");
  }
  if (!isRecord(payload.settings)) {
    throw new Error("配置文件缺少设置内容");
  }

  return normalizeSettings(payload.settings);
}

function normalizeSettings(
  value: Record<string, unknown> | ExtensionSettings,
): ExtensionSettings {
  const apiBaseUrl = readString(value.apiBaseUrl, "API 地址", 2_048)
    .trim()
    .replace(/\/+$/, "");
  const apiKey = readString(value.apiKey, "API Key", 8_192).trim();
  const model = readString(value.model, "模型名称", 512).trim();
  const posterStyle = value.posterStyle;

  if (!apiBaseUrl) throw new Error("配置文件中的 API 地址为空");
  try {
    const url = new URL(apiBaseUrl);
    if (url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error("配置文件中的 API 地址无效");
  }
  if (!isPosterStyle(posterStyle)) {
    throw new Error("配置文件中的海报风格不受支持");
  }

  return { apiBaseUrl, apiKey, model, posterStyle };
}

function readString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error("配置文件中的" + label + "格式无效");
  }
  if (value.length > maxLength) {
    throw new Error("配置文件中的" + label + "内容过长");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
