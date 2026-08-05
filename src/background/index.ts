import { cleanTitle, parseSummaryResponse, sampleArticle } from "../lib/article";
import {
  getSettings,
  getTask,
  removeTask,
  saveTask,
  taskStorageKey,
} from "../lib/storage";
import {
  assertShareablePage,
  buildChatCompletionsUrl,
  chooseCanonicalUrl,
  toOriginPattern,
} from "../lib/url";
import type {
  ArticleSummary,
  ExtensionSettings,
  ExtractedArticle,
  GenerationStage,
  GenerationTask,
  RuntimeRequest,
  RuntimeResponse,
} from "../types";

const operations = new Map<number, AbortController>();
const AI_TIMEOUT_MS = 28_000;

function messageOf(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "生成已取消";
  if (error instanceof Error) return error.message;
  return "生成失败，请稍后重试";
}

async function setGenerating(
  tabId: number,
  pageUrl: string,
  stage: GenerationStage,
  article?: ExtractedArticle,
): Promise<GenerationTask> {
  const task: GenerationTask = {
    status: "generating",
    stage,
    tabId,
    pageUrl,
    updatedAt: Date.now(),
    article,
  };
  await saveTask(task);
  return task;
}

async function extractFromTab(tabId: number, pageUrl: string): Promise<ExtractedArticle> {
  const tab = await browser.tabs.get(tabId);
  if (!tab.url || tab.url !== pageUrl) {
    throw new Error("页面地址已变化，请重新打开扩展");
  }
  await browser.scripting.executeScript({ target: { tabId }, files: ["/extractor.js"] });
  const response = (await browser.tabs.sendMessage(tabId, {
    type: "EXTRACT_PAGE",
  })) as RuntimeResponse<ExtractedArticle>;
  if (!response.ok || !response.data) {
    throw new Error(response.error || "正文提取失败");
  }

  const canonicalUrl = chooseCanonicalUrl(pageUrl, response.data.canonicalUrl);
  return {
    ...response.data,
    pageUrl,
    canonicalUrl,
    sourceDomain: new URL(canonicalUrl).hostname.replace(/^www\./i, ""),
    title: cleanTitle(
      response.data.title,
      response.data.siteName,
      response.data.sourceDomain,
    ),
  };
}

function responseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  const content = first?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === "object" && "text" in item
          ? String((item as { text: unknown }).text)
          : "",
      )
      .join("");
  }
  return "";
}

async function requestSummary(
  article: ExtractedArticle,
  signal: AbortSignal,
  settingsOverride?: ExtensionSettings,
): Promise<ArticleSummary> {
  const settings = settingsOverride ?? (await getSettings());
  if (!settings.apiKey.trim() || !settings.model.trim()) {
    throw new Error("请先配置 API Key 和模型名称");
  }
  const originPattern = toOriginPattern(settings.apiBaseUrl);
  const hasPermission = await browser.permissions.contains({ origins: [originPattern] });
  if (!hasPermission) {
    throw new Error("API 域名尚未授权，请到设置页重新保存配置");
  }

  const response = await fetch(buildChatCompletionsUrl(settings.apiBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      stream: false,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是严谨的中文文章摘要编辑。只总结输入中明确出现的观点，不添加事实、数字或结论。标题不需要改写。返回严格 JSON：{\"thesis\":\"40至70字核心观点\",\"points\":[\"20至35字要点\",\"20至35字要点\",\"20至35字要点\"]}。内容不足时允许只返回2条要点。摘要统一使用简体中文。",
        },
        { role: "user", content: sampleArticle(article) },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message?.slice(0, 180) || "";
    } catch {
      // Some compatible providers do not return JSON error bodies.
    }
    throw new Error(`AI 接口返回 ${response.status}${detail ? `：${detail}` : ""}`);
  }

  const payload = (await response.json()) as unknown;
  const content = responseText(payload);
  if (!content) throw new Error("AI 接口没有返回摘要内容");
  return parseSummaryResponse(content);
}

async function runGeneration(
  tabId: number,
  pageUrl: string,
  existingArticle?: ExtractedArticle,
): Promise<void> {
  const controller = new AbortController();
  operations.set(tabId, controller);
  const timeout = setTimeout(() => controller.abort("timeout"), AI_TIMEOUT_MS);
  let article = existingArticle;

  try {
    if (!article) {
      article = await extractFromTab(tabId, pageUrl);
    }
    await setGenerating(tabId, pageUrl, "analyzing", article);
    await setGenerating(tabId, pageUrl, "summarizing", article);
    const summary = await requestSummary(article, controller.signal);
    await setGenerating(tabId, pageUrl, "rendering", article);
    await saveTask({
      status: "ready",
      tabId,
      pageUrl,
      updatedAt: Date.now(),
      article,
      payload: {
        title: article.title,
        summary,
        sourceDomain: article.sourceDomain,
        canonicalUrl: article.canonicalUrl,
        imageDataUrl: article.imageDataUrl,
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      if (operations.get(tabId) === controller) await removeTask(tabId);
      return;
    }
    await saveTask({
      status: "error",
      tabId,
      pageUrl,
      updatedAt: Date.now(),
      article,
      error: messageOf(error),
    });
  } finally {
    clearTimeout(timeout);
    if (operations.get(tabId) === controller) operations.delete(tabId);
  }
}

async function startGeneration(
  tabId: number,
  pageUrl: string,
  article?: ExtractedArticle,
): Promise<GenerationTask> {
  assertShareablePage(pageUrl);
  operations.get(tabId)?.abort();
  const task = await setGenerating(tabId, pageUrl, article ? "analyzing" : "extracting", article);
  void runGeneration(tabId, pageUrl, article);
  return task;
}

async function getTaskForPage(
  tabId: number,
  pageUrl: string,
): Promise<GenerationTask | undefined> {
  const current = await getTask(tabId);
  if (current?.pageUrl !== pageUrl) {
    if (current) await removeTask(tabId);
    return undefined;
  }
  return current;
}

async function testConnection(settings: ExtensionSettings): Promise<string> {
  const sample: ExtractedArticle = {
    title: "连接测试",
    description: "",
    text: "这是一段用于测试摘要接口的公开示例文章。文章认为，好的分享应当同时保留内容摘要、原文来源和返回原文的入口。这样接收者无需先打开链接，也能快速理解文章重点，并在感兴趣时继续阅读。",
    headings: ["为什么需要信息海报", "保留原文入口"],
    pageUrl: "https://example.com/test",
    canonicalUrl: "https://example.com/test",
    sourceDomain: "example.com",
    siteName: "Example",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    await requestSummary(sample, controller.signal, settings);
    return "连接成功，返回内容可正常解析";
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRequest(request: RuntimeRequest): Promise<unknown> {
  switch (request.type) {
    case "GET_TASK":
      return getTaskForPage(request.tabId, request.pageUrl);
    case "START_GENERATION":
      return startGeneration(request.tabId, request.pageUrl);
    case "REGENERATE": {
      const current = await getTask(request.tabId);
      return startGeneration(request.tabId, request.pageUrl, current?.article);
    }
    case "CANCEL":
      operations.get(request.tabId)?.abort();
      await removeTask(request.tabId);
      return null;
    case "TEST_CONNECTION":
      return testConnection(request.settings);
  }
}

export function initializeBackground(): void {
  void browser.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  void browser.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });

  browser.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
    handleRequest(request)
      .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: messageOf(error) } satisfies RuntimeResponse),
      );
    return true;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    operations.get(tabId)?.abort();
    void browser.storage.session.remove(taskStorageKey(tabId));
  });
}
