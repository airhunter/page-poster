import { Readability } from "@mozilla/readability";

interface PageContent {
  title: string;
  content: string;
  textContent: string;
}

export function normalizeBodyText(value: string): string {
  const normalized = value
    .replace(/\r/g, "")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length <= 50_000) return normalized;
  return `${normalized.slice(0, 25_000)}\n\n${normalized.slice(-25_000)}`;
}

function mainContent(document: Document): PageContent | null {
  const container =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]');
  if (!container) return null;

  const clone = container.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      'script, style, noscript, template, form, nav, aside, footer, iframe, svg, button, textarea, select, [hidden], [aria-hidden="true"]',
    )
    .forEach((element) => element.remove());
  clone
    .querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6, div, section")
    .forEach((element) => element.append(document.createTextNode("\n")));

  const textContent = normalizeBodyText(clone.textContent || "");
  if (textContent.length < 500) return null;
  return { title: document.title, content: clone.innerHTML, textContent };
}

export function parsePageContent(document: Document): PageContent | null {
  try {
    const parsed = new Readability(document.cloneNode(true) as Document, {
      charThreshold: 400,
    }).parse();
    if (parsed && normalizeBodyText(parsed.textContent || "").length >= 500) {
      return {
        title: parsed.title || document.title,
        content: parsed.content || "",
        textContent: parsed.textContent || "",
      };
    }
  } catch {
    // Some discussion-page DOM trees make Readability throw while walking candidates.
  }
  return mainContent(document);
}
