import { Readability } from "@mozilla/readability";
import { isLikelyTitleCardImage } from "../lib/image";
import type { ExtractedArticle } from "../types";

declare global {
  interface Window {
    __PAGE_POSTER_EXTRACTOR_INSTALLED__?: boolean;
  }
}

function metaContent(...selectors: string[]): string {
  for (const selector of selectors) {
    const value = document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
    if (value) return value;
  }
  return "";
}

function absoluteUrl(rawUrl: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function collectImageCandidates(articleHtml: string): string[] {
  const candidates = [
    metaContent('meta[property="og:image"]', 'meta[name="twitter:image"]'),
  ];
  const parsed = new DOMParser().parseFromString(articleHtml, "text/html");
  const articleImages = [...parsed.querySelectorAll<HTMLImageElement>("img")]
    .map((image) => image.currentSrc || image.src || image.getAttribute("data-src") || "")
    .slice(0, 8);
  return [...new Set([...candidates, ...articleImages].map((item) => absoluteUrl(item)).filter(Boolean))] as string[];
}

async function imageAsDataUrl(imageUrl?: string): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  try {
    const response = await fetch(imageUrl, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > 2_000_000) return undefined;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function normalizeBodyText(value: string): string {
  const normalized = value
    .replace(/\r/g, "")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length <= 50_000) return normalized;
  return `${normalized.slice(0, 25_000)}\n\n${normalized.slice(-25_000)}`;
}

async function extractArticle(): Promise<ExtractedArticle> {
  if (document.contentType === "application/pdf") {
    throw new Error("第一版暂不支持 PDF");
  }

  const clone = document.cloneNode(true) as Document;
  const parsed = new Readability(clone, { charThreshold: 400 }).parse();
  const text = normalizeBodyText(parsed?.textContent || "");
  if (!parsed || text.length < 500) {
    throw new Error("没有提取到足够的连续正文，这个页面暂不适合生成海报");
  }

  const articleHtml = parsed.content || "";
  const articleDocument = new DOMParser().parseFromString(articleHtml, "text/html");
  const headings = [...articleDocument.querySelectorAll("h1, h2, h3")]
    .map((heading) => heading.textContent?.replace(/\s+/g, " ").trim() || "")
    .filter(Boolean)
    .slice(0, 40);
  const canonicalUrl =
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.href;
  const title = (parsed.title || document.title).replace(/\s+/g, " ").trim();
  const imageCandidates = collectImageCandidates(articleHtml);
  const imageUrl = imageCandidates.find((candidate) => !isLikelyTitleCardImage(candidate, title));
  const imageDataUrl = await imageAsDataUrl(imageUrl);

  return {
    title,
    description: metaContent('meta[name="description"]', 'meta[property="og:description"]'),
    text,
    headings,
    pageUrl: location.href,
    canonicalUrl,
    sourceDomain: location.hostname.replace(/^www\./i, ""),
    siteName: metaContent('meta[property="og:site_name"]'),
    imageUrl,
    imageDataUrl,
    language: document.documentElement.lang || undefined,
  };
}

export function initializeExtractor(): void {
  if (!window.__PAGE_POSTER_EXTRACTOR_INSTALLED__) {
    window.__PAGE_POSTER_EXTRACTOR_INSTALLED__ = true;
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "EXTRACT_PAGE") return undefined;
      extractArticle()
        .then((article) => sendResponse({ ok: true, data: article }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "正文提取失败",
          }),
        );
      return true;
    });
  }
}
