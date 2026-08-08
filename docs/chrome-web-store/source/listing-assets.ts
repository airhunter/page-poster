import { renderPoster } from "../../../src/poster/render";
import type { PosterStyle } from "../../../src/types";

declare global {
  interface Window {
    __ASSET_READY__?: boolean;
  }
}

const payload = {
  title: "Write-Only Code",
  summary: {
    thesis:
      "AI 加速软件迈向“只写代码”，工程师需重构信任机制，在不可读代码中降低系统风险。",
    points: [
      "代码生产逐渐超越人工审查极限，行业需要建立自动化信任体系。",
      "工程师角色转向系统设计与约束制定，核心是界定边界和管控风险。",
      "新的控制与问责机制，将成为大规模 AI 代码生产的基础设施。",
    ],
  },
  sourceDomain: "heavybit.com",
  canonicalUrl: "https://www.heavybit.com/library/article/write-only-code",
};

const styleNames: Record<PosterStyle, string> = {
  swiss: "瑞士编辑",
  signal: "夜间信号",
  collage: "拼贴杂志",
  oriental: "东方编辑",
};

const iconUrl = "/src/assets/icons/icon-128.png";
const assetName = new URLSearchParams(location.search).get("asset") || "screenshot-01";
const mount = document.querySelector<HTMLElement>("#asset")!;

function setMarkup(className: string, markup: string): void {
  document.body.className = className;
  mount.innerHTML = markup;
}

async function appendPoster(
  selector: string,
  style: PosterStyle,
  className = "poster-canvas",
): Promise<HTMLCanvasElement> {
  const canvas = await renderPoster(payload, style);
  canvas.className = className;
  document.querySelector<HTMLElement>(selector)?.append(canvas);
  return canvas;
}

function brandLockup(inverse = false): string {
  return `
    <div class="brand-lockup${inverse ? " brand-lockup--inverse" : ""}">
      <img src="${iconUrl}" alt="" />
      <div><strong>海报机</strong><span>PAGEPOSTER</span></div>
    </div>`;
}

function chromeDots(): string {
  return '<i class="dot dot--red"></i><i class="dot dot--yellow"></i><i class="dot dot--green"></i>';
}

async function renderScreenshot01(): Promise<void> {
  setMarkup(
    "screen screen-01",
    `<div class="screen-grid"></div>
     <header class="screen-brand">${brandLockup()}</header>
     <section class="hero-copy">
       <p class="eyebrow">ARTICLE → POSTER</p>
       <h1>把文章，<br /><em>一键变成</em>分享海报</h1>
       <p>中文 AI 摘要 · 来源域名 · 可扫描二维码</p>
       <div class="hero-pills"><span>主动点击才读取</span><span>1080 × 1440 PNG</span></div>
     </section>
     <section class="browser browser--article">
       <div class="browser-bar"><span>${chromeDots()}</span><div class="address">heavybit.com/library/article/write-only-code</div></div>
       <article class="article-page">
         <span class="article-kicker">SOFTWARE · AI</span>
         <h2>Write-Only Code</h2>
         <p class="article-deck">When code generation outpaces human review, software teams need a new foundation for trust.</p>
         <div class="article-meta">JOSEPH RUSCIO · 8 MIN READ</div>
         <p>AI systems are changing the scale at which software can be produced. The bottleneck is no longer typing code—it is knowing whether the resulting system behaves within its intended boundaries.</p>
         <p>Engineering teams need controls that work even when no person can read every generated line.</p>
       </article>
     </section>
     <aside class="popup-mock">
       <header>${brandLockup()}<button aria-label="设置">⚙</button></header>
       <div class="popup-panel">
         <div class="popup-status"><span><i></i>海报已就绪</span><b>3:4 · PNG</b></div>
         <div class="popup-poster" id="poster-main"></div>
         <div class="popup-actions"><strong>复制海报</strong><span>换一版</span></div>
       </div>
     </aside>`,
  );
  await appendPoster("#poster-main", "swiss");
}

async function renderScreenshot02(): Promise<void> {
  setMarkup(
    "screen screen-02",
    `<div class="screen-grid"></div>
     <header class="screen-header">
       ${brandLockup()}
       <div><p class="eyebrow">THREE STEPS</p><h1>从当前文章到 <em>1080 × 1440 PNG</em></h1></div>
     </header>
     <section class="workflow">
       <article class="workflow-card workflow-article">
         <div class="step"><b>01</b><span>读取当前文章</span></div>
         <div class="mini-browser">
           <div class="browser-bar"><span>${chromeDots()}</span><div class="address">公开文章</div></div>
           <div class="mini-article"><small>SOFTWARE · AI</small><h2>Write-Only<br />Code</h2><p>When code generation outpaces human review, teams need a new foundation for trust.</p><i></i><i></i><i></i></div>
         </div>
         <p class="card-note">只有点击“生成海报”后才处理当前页</p>
       </article>
       <div class="flow-arrow">→</div>
       <article class="workflow-card workflow-summary">
         <div class="step"><b>02</b><span>生成中文摘要</span></div>
         <div class="summary-sheet"><span>AI 内容摘要</span><h2>从逐行审查，转向可验证的信任机制</h2><ol><li>自动化信任体系</li><li>系统边界与约束</li><li>控制和问责机制</li></ol></div>
         <p class="card-note">用户自选兼容 AI 接口与模型</p>
       </article>
       <div class="flow-arrow">→</div>
       <article class="workflow-card workflow-output">
         <div class="step"><b>03</b><span>复制或下载</span></div>
         <div class="workflow-poster" id="workflow-poster"></div>
         <p class="card-note">二维码生成后重新解码校验</p>
       </article>
     </section>`,
  );
  await appendPoster("#workflow-poster", "swiss");
}

async function renderScreenshot03(): Promise<void> {
  setMarkup(
    "screen screen-03",
    `<div class="dark-grid"></div>
     <header class="screen-header screen-header--dark">
       ${brandLockup(true)}
       <div><p class="eyebrow">FOUR EDITORIAL SYSTEMS</p><h1>同一篇文章，<em>四种版式</em></h1><p>切换风格只重新排版，不重复调用 AI</p></div>
     </header>
     <section class="style-showcase">
       ${(["swiss", "signal", "collage", "oriental"] as PosterStyle[])
         .map(
           (style, index) => `
          <figure>
            <div class="style-poster" id="style-${style}"></div>
            <figcaption><b>0${index + 1}</b><span>${styleNames[style]}</span></figcaption>
          </figure>`,
         )
         .join("")}
     </section>`,
  );
  for (const style of ["swiss", "signal", "collage", "oriental"] as PosterStyle[]) {
    await appendPoster(`#style-${style}`, style);
  }
}

function styleCards(): string {
  return (["swiss", "signal", "collage", "oriental"] as PosterStyle[])
    .map(
      (style, index) => `
      <div class="settings-style ${style === "swiss" ? "is-selected" : ""}">
        <div class="settings-style__art settings-style__art--${style}"><i></i><b>WRITE</b><em>AI / BRIEF</em></div>
        <strong>0${index + 1} ${styleNames[style]}</strong>
      </div>`,
    )
    .join("");
}

async function renderScreenshot04(): Promise<void> {
  setMarkup(
    "screen screen-04",
    `<div class="screen-grid"></div>
     <header class="screen-header">
       ${brandLockup()}
       <div><p class="eyebrow">YOUR MODEL · YOUR CHOICE</p><h1>连接你信任的 <em>AI 接口</em></h1><p>兼容模型列表与 Chat Completions 的最小接口集</p></div>
     </header>
     <section class="settings-window">
       <aside class="settings-intro"><span>SETTINGS</span><h2>把好内容，排成<br />值得分享的海报。</h2><p>连接模型，选择你的海报风格。</p><div class="secure-note"><b>API Key</b><span>仅保存于本机 Chrome 存储<br />不会通过 Chrome 同步</span></div></aside>
       <div class="settings-form">
         <div class="section-title"><b>01</b><span>模型连接</span></div>
         <div class="settings-fields">
           <label class="wide"><span>API 地址 <em>BASE URL</em></span><div>https://api.example.com/v1</div></label>
           <label><span>API Key <em>SECRET</em></span><div>••••••••••••••••••••</div><small>Key 已保存在本机</small></label>
           <label><span>模型名称 <em>MODEL</em></span><div>example-model-1 ▾</div><small>通过 /models 获取</small></label>
         </div>
         <div class="settings-actions"><button>测试连接</button><strong>HTTPS</strong><span>只请求你填写的单个 API origin</span></div>
         <div class="section-title section-title--styles"><b>02</b><span>海报风格</span></div>
         <div class="settings-styles">${styleCards()}</div>
       </div>
     </section>`,
  );
}

async function renderScreenshot05(): Promise<void> {
  setMarkup(
    "screen screen-05",
    `<div class="screen-grid"></div>
     <header class="screen-brand">${brandLockup()}</header>
     <header class="privacy-heading"><p class="eyebrow">PRIVACY BY USER ACTION</p><h1>只在你点击后，<em>处理当前文章</em></h1><p>数据流清晰、权限按需、没有开发者中转服务器</p></header>
     <section class="privacy-flow">
       <article class="data-node data-node--page"><span>01 · CURRENT PAGE</span><div class="node-icon">▤</div><h2>当前公开文章</h2><p>标题、描述、章节标题<br />正文首尾片段</p><small>不读取 Cookie · 不扫描其他标签页</small></article>
       <div class="data-arrow"><b>用户点击<br />生成海报</b><i>→</i></div>
       <article class="data-node data-node--ai"><span>02 · YOUR AI</span><div class="node-icon">✦</div><h2>你配置的 AI 服务</h2><p>HTTPS API origin<br />Bearer API Key</p><small>内容直接发送 · 不经过开发者服务器</small></article>
       <div class="data-arrow"><b>返回 JSON<br />中文摘要</b><i>→</i></div>
       <article class="data-node data-node--poster"><span>03 · IN BROWSER</span><div class="node-icon">▣</div><h2>浏览器本地排版</h2><p>1080 × 1440 PNG<br />二维码解码校验</p><small>由你决定复制、下载或分享</small></article>
     </section>
     <footer class="privacy-points"><span><b>主动触发</b> 不在后台持续读取网页</span><span><b>最小权限</b> AI 域名运行时单独授权</span><span><b>无遥测</b> 不含广告与分析服务</span></footer>`,
  );
}

async function renderPromoSmall(): Promise<void> {
  setMarkup(
    "promo promo-small",
    `<div class="promo-background"></div>
     <section class="promo-copy">${brandLockup(true)}<h1>文章<br /><em>→</em> 分享海报</h1><p>AI 摘要 · 原文二维码</p></section>
     <div class="promo-posters promo-posters--small"><div id="promo-small-main"></div><i></i><b></b></div>`,
  );
  await appendPoster("#promo-small-main", "swiss");
}

async function renderPromoMarquee(): Promise<void> {
  setMarkup(
    "promo promo-marquee",
    `<div class="promo-background"></div>
     <section class="promo-copy">${brandLockup(true)}<p class="eyebrow">ARTICLE → POSTER</p><h1>把好内容，排成<br /><em>值得分享的海报。</em></h1><p class="promo-subtitle">中文 AI 摘要 · 四套编辑版式 · 原文二维码</p></section>
     <div class="marquee-posters"><div id="marquee-signal"></div><div id="marquee-swiss"></div><div id="marquee-oriental"></div></div>`,
  );
  await appendPoster("#marquee-signal", "signal");
  await appendPoster("#marquee-swiss", "swiss");
  await appendPoster("#marquee-oriental", "oriental");
}

async function renderIcon(): Promise<void> {
  setMarkup("store-icon", `<img src="${iconUrl}" alt="海报机 PagePoster" />`);
  await new Promise<void>((resolve) => {
    const image = document.querySelector<HTMLImageElement>("#asset img")!;
    if (image.complete) resolve();
    else image.addEventListener("load", () => resolve(), { once: true });
  });
}

const renderers: Record<string, () => Promise<void>> = {
  "screenshot-01": renderScreenshot01,
  "screenshot-02": renderScreenshot02,
  "screenshot-03": renderScreenshot03,
  "screenshot-04": renderScreenshot04,
  "screenshot-05": renderScreenshot05,
  "promo-small": renderPromoSmall,
  "promo-marquee": renderPromoMarquee,
  icon: renderIcon,
};

await (renderers[assetName] || renderScreenshot01)();
await document.fonts.ready;
window.__ASSET_READY__ = true;
document.documentElement.dataset.ready = "true";
