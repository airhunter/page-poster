export type GenerationStage =
  | "extracting"
  | "analyzing"
  | "summarizing"
  | "rendering";

export const POSTER_STYLES = ["swiss", "signal", "collage", "oriental"] as const;

export type PosterStyle = (typeof POSTER_STYLES)[number];

export function isPosterStyle(value: unknown): value is PosterStyle {
  return typeof value === "string" && POSTER_STYLES.includes(value as PosterStyle);
}

export interface ExtensionSettings {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  posterStyle: PosterStyle;
}

export interface ExtractedArticle {
  title: string;
  description: string;
  text: string;
  headings: string[];
  pageUrl: string;
  canonicalUrl: string;
  sourceDomain: string;
  siteName: string;
  imageUrl?: string;
  imageDataUrl?: string;
  language?: string;
}

export interface ArticleSummary {
  thesis: string;
  points: string[];
}

export interface PosterPayload {
  title: string;
  summary: ArticleSummary;
  sourceDomain: string;
  canonicalUrl: string;
  imageDataUrl?: string;
}

interface BaseTask {
  tabId: number;
  pageUrl: string;
  updatedAt: number;
  article?: ExtractedArticle;
}

export interface GeneratingTask extends BaseTask {
  status: "generating";
  stage: GenerationStage;
}

export interface ReadyTask extends BaseTask {
  status: "ready";
  payload: PosterPayload;
}

export interface ErrorTask extends BaseTask {
  status: "error";
  error: string;
}

export type GenerationTask = GeneratingTask | ReadyTask | ErrorTask;

export type RuntimeRequest =
  | { type: "GET_TASK"; tabId: number; pageUrl: string }
  | { type: "START_GENERATION"; tabId: number; pageUrl: string }
  | { type: "REGENERATE"; tabId: number; pageUrl: string }
  | { type: "CANCEL"; tabId: number }
  | { type: "TEST_CONNECTION"; settings: ExtensionSettings };

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
