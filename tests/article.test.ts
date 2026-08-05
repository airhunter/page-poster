import { describe, expect, it } from "vitest";
import { cleanTitle, parseSummaryResponse, sampleArticle } from "../src/lib/article";
import type { ExtractedArticle } from "../src/types";

const article: ExtractedArticle = {
  title: "测试文章",
  description: "文章描述",
  text: "开".repeat(10_000) + "结".repeat(10_000),
  headings: ["第一章", "结论"],
  pageUrl: "https://example.com/article",
  canonicalUrl: "https://example.com/article",
  sourceDomain: "example.com",
  siteName: "示例网站",
};

describe("article preparation", () => {
  it("cleans a matching site suffix without rewriting the title", () => {
    expect(cleanTitle("AI Agent 的可靠性问题｜示例网站", "示例网站", "example.com")).toBe(
      "AI Agent 的可靠性问题",
    );
    expect(cleanTitle("标题 — 另一种观点", "示例网站", "example.com")).toBe(
      "标题 — 另一种观点",
    );
  });

  it("samples both the start and the end of a long article", () => {
    const sample = sampleArticle(article);
    expect(sample).toContain("中间内容因篇幅省略");
    expect(sample).toContain("开".repeat(100));
    expect(sample).toContain("结".repeat(100));
    expect(sample.length).toBeLessThan(19_000);
  });
});

describe("summary response parsing", () => {
  it("accepts fenced JSON and normalizes bullets", () => {
    expect(
      parseSummaryResponse(`\`\`\`json
        {"thesis":"文章认为可靠分享需要摘要、来源与原文入口三者同时存在。","points":["• 摘要帮助接收者快速理解内容", "2. 来源域名帮助判断内容可信度", "二维码让读者可以返回原文"]}
      \`\`\``),
    ).toEqual({
      thesis: "文章认为可靠分享需要摘要、来源与原文入口三者同时存在。",
      points: [
        "摘要帮助接收者快速理解内容",
        "来源域名帮助判断内容可信度",
        "二维码让读者可以返回原文",
      ],
    });
  });

  it("rejects an incomplete response", () => {
    expect(() => parseSummaryResponse('{"thesis":"太短","points":[]}')).toThrow("内容不足");
  });
});
