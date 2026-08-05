import { describe, expect, it } from "vitest";
import {
  assertShareablePage,
  buildChatCompletionsUrl,
  buildModelsUrl,
  chooseCanonicalUrl,
  sanitizeArticleUrl,
  toOriginPattern,
} from "../src/lib/url";

describe("article URL handling", () => {
  it("removes tracking parameters but preserves business parameters", () => {
    expect(
      sanitizeArticleUrl(
        "https://example.com/read?id=42&utm_source=chat&lang=zh#comments",
      ),
    ).toBe("https://example.com/read?id=42&lang=zh");
  });

  it("only accepts a same-domain canonical URL", () => {
    expect(
      chooseCanonicalUrl(
        "https://news.example.com/a?utm_medium=social",
        "https://news.example.com/a",
      ),
    ).toBe("https://news.example.com/a");
    expect(
      chooseCanonicalUrl("https://news.example.com/a?id=2", "https://tracker.example.net/a"),
    ).toBe("https://news.example.com/a?id=2");
  });

  it("blocks private and unsupported pages", () => {
    expect(() => assertShareablePage("http://192.168.1.8/article")).toThrow("隐私");
    expect(() => assertShareablePage("file:///tmp/article.html")).toThrow("公开访问");
    expect(() => assertShareablePage("https://example.com/report.pdf")).toThrow("PDF");
    expect(() => assertShareablePage("https://example.com/article")).not.toThrow();
  });
});

describe("AI endpoint handling", () => {
  it("builds the chat completions endpoint", () => {
    expect(buildChatCompletionsUrl("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(buildChatCompletionsUrl("https://example.com/v1/chat/completions")).toBe(
      "https://example.com/v1/chat/completions",
    );
    expect(buildChatCompletionsUrl("https://example.com/v1/models")).toBe(
      "https://example.com/v1/chat/completions",
    );
  });

  it("builds the model-list endpoint", () => {
    expect(buildModelsUrl("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1/models",
    );
    expect(buildModelsUrl("https://example.com/v1/chat/completions")).toBe(
      "https://example.com/v1/models",
    );
    expect(buildModelsUrl("https://example.com/v1/models")).toBe(
      "https://example.com/v1/models",
    );
  });

  it("derives a narrow runtime host permission", () => {
    expect(toOriginPattern("https://models.example.com/v1")).toBe(
      "https://models.example.com/*",
    );
  });
});
