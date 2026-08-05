const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref_src",
  "spm",
]);

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i,
];

export function sanitizeArticleUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";
  return url.toString();
}

export function chooseCanonicalUrl(pageUrl: string, canonicalUrl?: string): string {
  const page = new URL(pageUrl);
  if (canonicalUrl) {
    try {
      const canonical = new URL(canonicalUrl, page);
      if (
        ["http:", "https:"].includes(canonical.protocol) &&
        canonical.hostname === page.hostname
      ) {
        return sanitizeArticleUrl(canonical.toString());
      }
    } catch {
      // Invalid canonical links are common; use the address bar URL instead.
    }
  }
  return sanitizeArticleUrl(page.toString());
}

export function assertShareablePage(rawUrl: string): void {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("当前页面不是可公开访问的网页");
  }
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error("为保护隐私，暂不处理本机、局域网或内网页面");
  }
  if (/\.pdf(?:$|[?#])/i.test(url.pathname) || url.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("第一版暂不支持 PDF");
  }
}

export function toOriginPattern(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API 地址必须使用 http 或 https");
  }
  return `${url.origin}/*`;
}

export function buildChatCompletionsUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("请填写 API 地址");
  const url = new URL(trimmed);
  if (url.pathname.endsWith("/chat/completions")) return url.toString();
  if (url.pathname.endsWith("/models")) {
    url.pathname = `${url.pathname.slice(0, -"/models".length)}/chat/completions`;
    return url.toString();
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  return url.toString();
}

export function buildModelsUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("请填写 API 地址");
  const url = new URL(trimmed);
  if (url.pathname.endsWith("/models")) return url.toString();
  if (url.pathname.endsWith("/chat/completions")) {
    url.pathname = `${url.pathname.slice(0, -"/chat/completions".length)}/models`;
    return url.toString();
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/models`;
  return url.toString();
}
