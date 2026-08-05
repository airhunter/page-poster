import type { ArticleSummary, ExtractedArticle } from "../types";

const MAX_SAMPLE_PART = 9_000;

export function cleanTitle(title: string, siteName = "", sourceDomain = ""): string {
  let result = title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const suffixes = [siteName, sourceDomain, sourceDomain.split(".")[0] ?? ""]
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  for (const suffix of suffixes) {
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\s*(?:[-–—|｜·])\\s*${escaped}\\s*$`, "i"), "").trim();
  }
  return result || title.trim();
}

export function sampleArticle(article: ExtractedArticle): string {
  const text = article.text.trim();
  const body =
    text.length <= MAX_SAMPLE_PART * 2
      ? text
      : `${text.slice(0, MAX_SAMPLE_PART)}\n\n[中间内容因篇幅省略]\n\n${text.slice(-MAX_SAMPLE_PART)}`;

  return [
    `标题：${article.title}`,
    article.description ? `网页描述：${article.description}` : "",
    article.headings.length ? `章节标题：\n${article.headings.map((item) => `- ${item}`).join("\n")}` : "",
    `正文：\n${body}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function trimFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseSummaryResponse(content: string): ArticleSummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimFence(content));
  } catch {
    throw new Error("模型没有返回可解析的 JSON 摘要");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型返回的摘要结构无效");
  }
  const record = parsed as Record<string, unknown>;
  const thesis = typeof record.thesis === "string" ? normalizeText(record.thesis) : "";
  const points = Array.isArray(record.points)
    ? record.points.filter((item): item is string => typeof item === "string").map(normalizeText)
    : [];

  if (thesis.length < 12 || points.length < 2) {
    throw new Error("模型返回的摘要内容不足");
  }

  return {
    thesis: limitText(thesis, 90),
    points: points.filter(Boolean).slice(0, 3).map((point) => limitText(point, 48)),
  };
}

export function normalizeText(value: string): string {
  return value.replace(/^[-•*\d.、\s]+/, "").replace(/\s+/g, " ").trim();
}

export function limitText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
