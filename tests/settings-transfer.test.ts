import { describe, expect, it } from "vitest";
import {
  parseSettingsFile,
  serializeSettingsFile,
  SETTINGS_FILE_FORMAT,
  SETTINGS_SCHEMA_VERSION,
} from "../src/lib/settings-transfer";
import type { ExtensionSettings } from "../src/types";

const SETTINGS: ExtensionSettings = {
  apiBaseUrl: "https://api.example.com/v1",
  apiKey: "sk-example-secret",
  model: "example-model",
  posterStyle: "collage",
};

describe("settings file transfer", () => {
  it("round-trips all settings through a versioned file", () => {
    const source = serializeSettingsFile(SETTINGS, new Date("2026-08-05T10:20:30.000Z"));
    const payload = JSON.parse(source) as Record<string, unknown>;

    expect(payload).toMatchObject({
      format: SETTINGS_FILE_FORMAT,
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      exportedAt: "2026-08-05T10:20:30.000Z",
      settings: SETTINGS,
    });
    expect(parseSettingsFile(source)).toEqual(SETTINGS);
  });

  it("normalizes whitespace while allowing an empty key and model", () => {
    const source = serializeSettingsFile({
      apiBaseUrl: "  https://api.example.com/v1///  ",
      apiKey: "   ",
      model: "",
      posterStyle: "swiss",
    });

    expect(parseSettingsFile(source)).toEqual({
      apiBaseUrl: "https://api.example.com/v1",
      apiKey: "",
      model: "",
      posterStyle: "swiss",
    });
  });

  it("rejects malformed or unrelated JSON files", () => {
    expect(() => parseSettingsFile("{")).toThrow("配置文件不是有效的 JSON");
    expect(() => parseSettingsFile('{"format":"another-app"}')).toThrow(
      "这不是海报机导出的配置文件",
    );
  });

  it("rejects unsupported versions and poster styles", () => {
    const payload = JSON.parse(serializeSettingsFile(SETTINGS)) as Record<string, unknown>;
    expect(() =>
      parseSettingsFile(JSON.stringify({ ...payload, schemaVersion: 2 })),
    ).toThrow("暂不支持配置文件版本");

    expect(() =>
      parseSettingsFile(
        JSON.stringify({
          ...payload,
          settings: { ...SETTINGS, posterStyle: "unknown" },
        }),
      ),
    ).toThrow("配置文件中的海报风格不受支持");
  });

  it("rejects malformed or non-http API addresses", () => {
    const payload = JSON.parse(serializeSettingsFile(SETTINGS)) as Record<string, unknown>;

    for (const apiBaseUrl of ["not a url", "file:///tmp/api"]) {
      expect(() =>
        parseSettingsFile(
          JSON.stringify({
            ...payload,
            settings: { ...SETTINGS, apiBaseUrl },
          }),
        ),
      ).toThrow("配置文件中的 API 地址无效");
    }
  });
});
