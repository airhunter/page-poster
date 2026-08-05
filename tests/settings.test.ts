import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, getSettings } from "../src/lib/storage";
import { isPosterStyle } from "../src/types";

const get = vi.fn();

beforeEach(() => {
  get.mockReset();
  vi.stubGlobal("browser", {
    storage: {
      local: { get },
    },
  });
});

describe("poster style settings", () => {
  it("uses Swiss editorial as the default style", () => {
    expect(DEFAULT_SETTINGS.posterStyle).toBe("swiss");
  });

  it("does not preselect a model", () => {
    expect(DEFAULT_SETTINGS.model).toBe("");
  });

  it("keeps a saved style", async () => {
    get.mockResolvedValue({ settings: { posterStyle: "signal" } });
    await expect(getSettings()).resolves.toMatchObject({ posterStyle: "signal" });
  });

  it("migrates missing or invalid old settings to style 1", async () => {
    get.mockResolvedValue({ settings: { posterStyle: "unknown" } });
    await expect(getSettings()).resolves.toMatchObject({ posterStyle: "swiss" });
  });

  it("only accepts the four supported style ids", () => {
    expect(["swiss", "signal", "collage", "oriental"].every(isPosterStyle)).toBe(true);
    expect(isPosterStyle("classic")).toBe(false);
  });
});
