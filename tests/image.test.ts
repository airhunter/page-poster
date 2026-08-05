import { describe, expect, it } from "vitest";
import { isLikelyTitleCardImage } from "../src/lib/image";

describe("hero image selection", () => {
  it("skips images whose path repeats the article title", () => {
    expect(
      isLikelyTitleCardImage(
        "https://cdn.example.com/share/write-only-code-cover.png",
        "Write-Only Code",
      ),
    ).toBe(true);
  });

  it("keeps ordinary editorial images", () => {
    expect(
      isLikelyTitleCardImage(
        "https://cdn.example.com/photos/joseph-ruscio-portrait.jpg",
        "Write-Only Code",
      ),
    ).toBe(false);
  });

  it("supports an encoded long Chinese title in the path", () => {
    expect(
      isLikelyTitleCardImage(
        `https://cdn.example.com/${encodeURIComponent("只写代码的时代")}.png`,
        "只写代码的时代",
      ),
    ).toBe(true);
  });
});
