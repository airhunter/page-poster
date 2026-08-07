import { parseModelList } from "../lib/models";
import { parseSettingsFile, serializeSettingsFile } from "../lib/settings-transfer";
import { getSettings, saveSettings } from "../lib/storage";
import { buildModelsUrl, toOriginPattern } from "../lib/url";
import { isPosterStyle, type ExtensionSettings, type RuntimeResponse } from "../types";

const form = document.querySelector<HTMLFormElement>("#settingsForm")!;
const apiBaseInput = document.querySelector<HTMLInputElement>("#apiBaseUrl")!;
const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey")!;
const modelSelect = document.querySelector<HTMLSelectElement>("#model")!;
const modelHint = document.querySelector<HTMLElement>("#modelHint")!;
const keyHint = document.querySelector<HTMLElement>("#keyHint")!;
const fetchModelsButton = document.querySelector<HTMLButtonElement>("#fetchModelsButton")!;
const fetchModelsButtonLabel = document.querySelector<HTMLElement>("#fetchModelsButtonLabel")!;
const testButton = document.querySelector<HTMLButtonElement>("#testButton")!;
const testButtonLabel = document.querySelector<HTMLElement>("#testButtonLabel")!;
const saveButton = document.querySelector<HTMLButtonElement>("#saveButton")!;
const saveButtonLabel = document.querySelector<HTMLElement>("#saveButtonLabel")!;
const importSettingsButton =
  document.querySelector<HTMLButtonElement>("#importSettingsButton")!;
const exportSettingsButton =
  document.querySelector<HTMLButtonElement>("#exportSettingsButton")!;
const settingsFileInput =
  document.querySelector<HTMLInputElement>("#settingsFileInput")!;
const clearKeyButton = document.querySelector<HTMLButtonElement>("#clearKeyButton")!;
const toggleKeyButton = document.querySelector<HTMLButtonElement>("#toggleKeyButton")!;
const status = document.querySelector<HTMLElement>("#status")!;
const styleInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="posterStyle"]'),
);

let currentSettings: ExtensionSettings = {
  apiBaseUrl: "",
  apiKey: "",
  model: "",
  posterStyle: "swiss",
};
let allowStoredKeyFallback = true;
let statusTimer: number | undefined;
const MAX_SETTINGS_FILE_BYTES = 64 * 1024;

function showStatus(message: string, isError = false): void {
  window.clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.toggle("error", isError);
  status.classList.remove("is-hidden");
  statusTimer = window.setTimeout(() => status.classList.add("is-hidden"), 3_500);
}

function readForm(): ExtensionSettings {
  const selectedStyle = styleInputs.find((input) => input.checked)?.value;
  return {
    apiBaseUrl: apiBaseInput.value.trim().replace(/\/+$/, ""),
    apiKey:
      apiKeyInput.value.trim() ||
      (allowStoredKeyFallback ? currentSettings.apiKey : ""),
    model: modelSelect.value.trim(),
    posterStyle: isPosterStyle(selectedStyle) ? selectedStyle : "swiss",
  };
}

function validateConnection(settings: ExtensionSettings, requireModel = true): void {
  if (!settings.apiBaseUrl) throw new Error("请填写 API 地址");
  if (!settings.apiKey) throw new Error("请填写 API Key");
  if (requireModel && !settings.model) throw new Error("请先获取并选择模型");
}

async function requestApiPermission(apiBaseUrl: string): Promise<string> {
  const pattern = toOriginPattern(apiBaseUrl);
  const granted = await browser.permissions.request({ origins: [pattern] });
  if (!granted) throw new Error("未获得 API 域名访问权限");
  return pattern;
}

function setModelOptions(models: string[], selectedModel = ""): void {
  const uniqueModels = [...new Set(models)];
  if (selectedModel && !uniqueModels.includes(selectedModel)) uniqueModels.unshift(selectedModel);

  const placeholder = new Option(
    uniqueModels.length ? "请选择模型" : "请先获取模型列表",
    "",
    false,
    !selectedModel,
  );
  placeholder.disabled = true;
  const options = uniqueModels.map((model) => new Option(model, model, false, model === selectedModel));
  modelSelect.replaceChildren(placeholder, ...options);
  modelSelect.disabled = uniqueModels.length === 0;
  modelSelect.value = selectedModel;
}

function applySettingsToForm(settings: ExtensionSettings, imported: boolean): void {
  if (!imported) currentSettings = settings;
  allowStoredKeyFallback = !imported;
  apiBaseInput.value = settings.apiBaseUrl;
  apiKeyInput.value = settings.apiKey;
  apiKeyInput.type = "password";
  toggleKeyButton.setAttribute("aria-pressed", "false");
  toggleKeyButton.setAttribute("aria-label", "显示 API Key");
  setModelOptions(settings.model ? [settings.model] : [], settings.model);
  styleInputs.forEach((input) => {
    input.checked = input.value === settings.posterStyle;
  });

  if (imported) {
    keyHint.textContent = settings.apiKey
      ? "已从文件导入 Key，保存前仅在本页生效。"
      : "导入文件未包含 API Key。";
    modelHint.textContent = settings.model
      ? "已从文件导入模型：" + settings.model
      : "导入文件未选择模型，请获取模型列表。";
    return;
  }

  keyHint.textContent = settings.apiKey ? "Key 已保存在本机。" : "尚未保存 Key。";
  modelHint.textContent = settings.model
    ? "当前模型：" + settings.model
    : "填写 API 地址和 Key 后获取模型列表。";
}

function downloadSettingsFile(): void {
  const source = serializeSettingsFile(readForm());
  const blob = new Blob([source], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "page-poster-settings-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 2_000);
  showStatus("✓ 配置已导出，请妥善保管含 API Key 的文件");
}

async function importSettingsFile(file: File): Promise<void> {
  if (file.size > MAX_SETTINGS_FILE_BYTES) {
    throw new Error("配置文件不能超过 64 KB");
  }
  const settings = parseSettingsFile(await file.text());
  applySettingsToForm(settings, true);
  showStatus("✓ 配置已导入，确认后点击“保存并关闭”");
}

async function responseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: unknown }; message?: unknown };
    const detail = payload.error?.message ?? payload.message;
    if (typeof detail === "string" && detail.trim()) return detail.trim().slice(0, 180);
  } catch {
    // Compatible APIs may return a plain-text or empty error body.
  }
  return `接口返回 ${response.status}`;
}

async function fetchModels(): Promise<void> {
  const settings = readForm();
  validateConnection(settings, false);
  await requestApiPermission(settings.apiBaseUrl);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(buildModelsUrl(settings.apiBaseUrl), {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(await responseError(response));
    const models = parseModelList((await response.json()) as unknown);
    const selectedModel = models.includes(settings.model) ? settings.model : "";
    setModelOptions(models, selectedModel);
    modelHint.textContent = `已获取 ${models.length} 个模型，请选择一个模型。`;
    modelSelect.focus();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function persistFromGesture(): Promise<ExtensionSettings> {
  const settings = readForm();
  validateConnection(settings);
  const pattern = await requestApiPermission(settings.apiBaseUrl);
  const previousPattern = currentSettings.apiBaseUrl
    ? toOriginPattern(currentSettings.apiBaseUrl)
    : undefined;

  await saveSettings(settings);
  if (previousPattern && previousPattern !== pattern) {
    await browser.permissions.remove({ origins: [previousPattern] });
  }
  currentSettings = settings;
  allowStoredKeyFallback = true;
  apiKeyInput.value = settings.apiKey;
  keyHint.textContent = "Key 已保存在本机。";
  return settings;
}

async function closeSettingsPage(): Promise<void> {
  try {
    const tab = await browser.tabs.getCurrent();
    if (tab?.id !== undefined) {
      await browser.tabs.remove(tab.id);
      return;
    }
  } catch {
    // Fall back to the window API when the page is not hosted in a normal tab.
  }
  window.close();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  saveButtonLabel.textContent = "正在保存…";
  void persistFromGesture()
    .then(() => {
      showStatus("✓ 配置已保存");
      window.setTimeout(() => {
        void closeSettingsPage().finally(() => {
          saveButton.disabled = false;
          saveButtonLabel.textContent = "保存并关闭";
        });
      }, 450);
    })
    .catch((error: unknown) => {
      showStatus(error instanceof Error ? error.message : "保存失败", true);
      saveButton.disabled = false;
      saveButtonLabel.textContent = "保存并关闭";
    });
});

fetchModelsButton.addEventListener("click", () => {
  fetchModelsButton.disabled = true;
  fetchModelsButton.classList.add("is-loading");
  fetchModelsButtonLabel.textContent = "正在获取…";
  void fetchModels()
    .catch((error: unknown) =>
      showStatus(error instanceof Error ? error.message : "获取模型失败", true),
    )
    .finally(() => {
      fetchModelsButton.disabled = false;
      fetchModelsButton.classList.remove("is-loading");
      fetchModelsButtonLabel.textContent = "获取模型";
    });
});

importSettingsButton.addEventListener("click", () => {
  settingsFileInput.value = "";
  settingsFileInput.click();
});

settingsFileInput.addEventListener("change", () => {
  const file = settingsFileInput.files?.[0];
  if (!file) return;

  importSettingsButton.disabled = true;
  void importSettingsFile(file)
    .catch((error: unknown) =>
      showStatus(error instanceof Error ? error.message : "导入配置失败", true),
    )
    .finally(() => {
      importSettingsButton.disabled = false;
      settingsFileInput.value = "";
    });
});

exportSettingsButton.addEventListener("click", () => {
  try {
    downloadSettingsFile();
  } catch (error) {
    showStatus(error instanceof Error ? error.message : "导出配置失败", true);
  }
});

testButton.addEventListener("click", () => {
  testButton.disabled = true;
  testButtonLabel.textContent = "正在测试…";
  void (async () => {
    const settings = readForm();
    validateConnection(settings);
    await requestApiPermission(settings.apiBaseUrl);
    const response = (await browser.runtime.sendMessage({
      type: "TEST_CONNECTION",
      settings,
    })) as RuntimeResponse<string>;
    if (!response.ok) throw new Error(response.error || "连接测试失败");
    showStatus(`✓ ${response.data}`);
  })()
    .catch((error: unknown) =>
      showStatus(error instanceof Error ? error.message : "连接测试失败", true),
    )
    .finally(() => {
      testButton.disabled = false;
      testButtonLabel.textContent = "测试连接";
    });
});

clearKeyButton.addEventListener("click", () => {
  void (async () => {
    currentSettings = { ...currentSettings, apiKey: "" };
    allowStoredKeyFallback = true;
    await saveSettings(currentSettings);
    apiKeyInput.value = "";
    apiKeyInput.type = "password";
    toggleKeyButton.setAttribute("aria-pressed", "false");
    toggleKeyButton.setAttribute("aria-label", "显示 API Key");
    keyHint.textContent = "尚未保存 Key。";
    showStatus("已清除 API Key");
  })();
});

toggleKeyButton.addEventListener("click", () => {
  const shouldShow = apiKeyInput.type === "password";
  apiKeyInput.type = shouldShow ? "text" : "password";
  toggleKeyButton.setAttribute("aria-pressed", String(shouldShow));
  toggleKeyButton.setAttribute("aria-label", shouldShow ? "隐藏 API Key" : "显示 API Key");
  apiKeyInput.focus();
});

for (const input of [apiBaseInput, apiKeyInput]) {
  input.addEventListener("input", () => {
    modelHint.textContent = "连接信息已变化，请重新获取模型列表。";
  });
}

void getSettings()
  .then((settings) => {
    applySettingsToForm(settings, false);
  })
  .catch((error: unknown) => {
    showStatus(error instanceof Error ? error.message : "读取配置失败", true);
  })
  .finally(() => {
    importSettingsButton.disabled = false;
    exportSettingsButton.disabled = false;
  });
