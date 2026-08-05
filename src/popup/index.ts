import { getSettings, taskStorageKey } from "../lib/storage";
import { canvasToPngBlob, renderPoster } from "../poster/render";
import type { GenerationTask, PosterStyle, RuntimeRequest, RuntimeResponse } from "../types";

const views = {
  idle: document.querySelector<HTMLElement>("#idleView")!,
  loading: document.querySelector<HTMLElement>("#loadingView")!,
  preview: document.querySelector<HTMLElement>("#previewView")!,
  error: document.querySelector<HTMLElement>("#errorView")!,
  config: document.querySelector<HTMLElement>("#configView")!,
};
const stageLabel = document.querySelector<HTMLElement>("#stageLabel")!;
const pageLabel = document.querySelector<HTMLElement>("#pageLabel")!;
const errorMessage = document.querySelector<HTMLElement>("#errorMessage")!;
const posterMount = document.querySelector<HTMLElement>("#posterMount")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadButton")!;

let activeTabId: number | undefined;
let activePageUrl = "";
let currentCanvas: HTMLCanvasElement | undefined;
let renderedVersion = 0;
let posterStyle: PosterStyle = "swiss";
let toastTimer: number | undefined;

function showView(name: keyof typeof views): void {
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("is-hidden", key !== name);
  });
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("is-hidden");
  toastTimer = window.setTimeout(() => toast.classList.add("is-hidden"), 2_800);
}

async function send<T>(request: RuntimeRequest): Promise<T> {
  const response = (await browser.runtime.sendMessage(request)) as RuntimeResponse<T>;
  if (!response.ok) throw new Error(response.error || "操作失败");
  return response.data as T;
}

const stageCopy: Record<string, string> = {
  extracting: "正在提取正文",
  analyzing: "正在分析文章观点",
  summarizing: "正在生成中文摘要",
  rendering: "正在排版并验证二维码",
};

async function displayTask(task: GenerationTask): Promise<void> {
  if (task.status === "generating") {
    stageLabel.textContent = stageCopy[task.stage] || "正在生成海报";
    showView("loading");
    return;
  }
  if (task.status === "error") {
    errorMessage.textContent = task.error;
    showView("error");
    return;
  }

  if (renderedVersion === task.updatedAt && currentCanvas) {
    showView("preview");
    return;
  }
  stageLabel.textContent = "正在排版并验证二维码";
  showView("loading");
  try {
    const canvas = await renderPoster(task.payload, posterStyle);
    currentCanvas = canvas;
    renderedVersion = task.updatedAt;
    posterMount.replaceChildren(canvas);
    downloadButton.classList.add("is-hidden");
    showView("preview");
  } catch (error) {
    errorMessage.textContent = error instanceof Error ? error.message : "海报渲染失败";
    showView("error");
  }
}

async function initialize(): Promise<void> {
  const [settings, tabs] = await Promise.all([
    getSettings(),
    browser.tabs.query({ active: true, currentWindow: true }),
  ]);
  posterStyle = settings.posterStyle;
  const [tab] = tabs;
  if (!tab?.id || !tab.url) {
    throw new Error("无法读取当前标签页");
  }
  activeTabId = tab.id;
  activePageUrl = tab.url;
  pageLabel.textContent = tab.title?.trim() || new URL(tab.url).hostname;
  if (!settings.apiKey.trim() || !settings.model.trim()) {
    showView("config");
    return;
  }
  const task = await send<GenerationTask | undefined>({
    type: "GET_TASK",
    tabId: activeTabId,
    pageUrl: activePageUrl,
  });
  if (task) await displayTask(task);
  else showView("idle");
}

async function startGeneration(): Promise<void> {
  if (activeTabId === undefined) return;
  renderedVersion = 0;
  currentCanvas = undefined;
  const task = await send<GenerationTask>({
    type: "START_GENERATION",
    tabId: activeTabId,
    pageUrl: activePageUrl,
  });
  await displayTask(task);
}

async function regenerate(): Promise<void> {
  if (activeTabId === undefined) return;
  renderedVersion = 0;
  currentCanvas = undefined;
  const task = await send<GenerationTask>({
    type: "REGENERATE",
    tabId: activeTabId,
    pageUrl: activePageUrl,
  });
  await displayTask(task);
}

document.querySelector("#settingsButton")?.addEventListener("click", () => {
  void browser.runtime.openOptionsPage();
});
document.querySelector("#openConfigButton")?.addEventListener("click", () => {
  void browser.runtime.openOptionsPage();
});
document.querySelector("#generateButton")?.addEventListener("click", () => {
  void startGeneration().catch((error: unknown) => {
    errorMessage.textContent = error instanceof Error ? error.message : "生成失败";
    showView("error");
  });
});
document.querySelector("#regenerateButton")?.addEventListener("click", () => {
  void regenerate().catch((error: unknown) => showToast(error instanceof Error ? error.message : "换一版失败"));
});
document.querySelector("#retryButton")?.addEventListener("click", () => {
  void regenerate().catch((error: unknown) => showToast(error instanceof Error ? error.message : "重试失败"));
});
document.querySelector("#cancelLoadingButton")?.addEventListener("click", () => {
  if (activeTabId !== undefined) void send({ type: "CANCEL", tabId: activeTabId });
  window.close();
});
document.querySelector("#cancelPreviewButton")?.addEventListener("click", () => window.close());

document.querySelector("#copyButton")?.addEventListener("click", () => {
  void (async () => {
    if (!currentCanvas) return;
    const blob = await canvasToPngBlob(currentCanvas);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      downloadButton.classList.add("is-hidden");
      showToast("✓ 已复制，可粘贴到微信或 QQ");
    } catch {
      downloadButton.classList.remove("is-hidden");
      showToast("复制失败，可使用下方下载按钮");
    }
  })().catch((error: unknown) => showToast(error instanceof Error ? error.message : "复制失败"));
});

downloadButton.addEventListener("click", () => {
  void (async () => {
    if (!currentCanvas) return;
    const blob = await canvasToPngBlob(currentCanvas);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `page-poster-${Date.now()}.png`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  })();
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || activeTabId === undefined) return;
  const change = changes[taskStorageKey(activeTabId)];
  if (change?.newValue) void displayTask(change.newValue as GenerationTask);
  else if (change) showView("idle");
});

void initialize().catch((error: unknown) => {
  errorMessage.textContent = error instanceof Error ? error.message : "初始化失败";
  showView("error");
});
