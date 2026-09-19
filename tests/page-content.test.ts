import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePageContent } from "../src/lib/page-content";

afterEach(() => vi.restoreAllMocks());

describe("page content extraction", () => {
  it("falls back to discussion text when Readability crashes on nested comments", () => {
    const comment =
      "Understanding the existing business logic before rewriting it reveals important behavior. ".repeat(5);
    const { document } = parseHTML(`
      <html><head><title>There's No Limit to How Bad Code Can Get | Lobsters</title></head>
      <body>
        <nav>Navigation and account links should not be summarized.</nav>
        <main>
          <ol class="stories"><li>There's No Limit to How Bad Code Can Get</li></ol>
          <form><p>Private form text should not be summarized.</p></form>
          <ol id="story_comments">
            <li><div class="comment"><div class="comment_text"><p>${comment}</p></div>
              <ol><li><div class="comment"><div class="comment_text"><p>${comment}</p></div></div></li></ol>
            </div></li>
          </ol>
        </main>
      </body></html>
    `);
    vi.spyOn(Readability.prototype, "parse").mockImplementationOnce(() => {
      throw new TypeError("Cannot read properties of null (reading 'tagName')");
    });

    const result = parsePageContent(document as unknown as Document);

    expect(result?.textContent).toContain(comment.trim());
    expect(result?.textContent).not.toContain("Private form text");
    expect(result?.textContent).not.toContain("Navigation and account links");
    expect(result?.textContent.length).toBeGreaterThan(500);
  });

  it("rejects a short main area after Readability fails", () => {
    const { document } = parseHTML("<html><body><main>Just links</main></body></html>");
    vi.spyOn(Readability.prototype, "parse").mockImplementationOnce(() => null);

    expect(parsePageContent(document as unknown as Document)).toBeNull();
  });
});
