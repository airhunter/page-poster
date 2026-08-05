function modelId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const item = value as { id?: unknown; name?: unknown };
  if (typeof item.id === "string") return item.id.trim();
  if (typeof item.name === "string") return item.name.trim();
  return "";
}

export function parseModelList(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("模型接口返回格式不正确");
  }

  const object = payload as { data?: unknown; models?: unknown };
  const items = Array.isArray(object.data)
    ? object.data
    : Array.isArray(object.models)
      ? object.models
      : [];
  const models = [...new Set(items.map(modelId).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  if (!models.length) throw new Error("接口没有返回可用模型");
  return models;
}
