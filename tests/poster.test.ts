import { describe, expect, it } from "vitest";
import { ORIENTAL_WATERMARK } from "../src/poster/render";

describe("oriental poster", () => {
  it("uses template copy instead of content from the example article", () => {
    expect(ORIENTAL_WATERMARK).toBe("海报摘要");
    expect(ORIENTAL_WATERMARK).not.toContain("只写代码");
  });
});
