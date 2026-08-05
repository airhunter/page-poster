import { renderPoster } from "../src/poster/render";
import type { PosterStyle } from "../src/types";

const payload = {
  title: "Write-Only Code",
  summary: {
    thesis:
      "AI加速软件迈向“只写代码”，人类不再逐行审查，工程师需重构信任机制以在不可读代码中降低风险。",
    points: [
      "模型能力提升使代码生产超越人工审查极限，迫使行业从依赖人工审核转向建立自动化信任体系。",
      "工程师角色由代码编写者转变为系统设计者与约束制定者，核心职责聚焦于界定边界与管控风险。",
      "成功关键在于摒弃对传统审查的执念，投资构建适应大规模不可读代码的新控制与问责原语。",
    ],
  },
  sourceDomain: "heavybit.com",
  canonicalUrl: "https://www.heavybit.com/library/article/write-only-code",
};

const styles: Array<{ id: PosterStyle; name: string }> = [
  { id: "swiss", name: "01 瑞士编辑" },
  { id: "signal", name: "02 夜间信号" },
  { id: "collage", name: "03 拼贴杂志" },
  { id: "oriental", name: "04 东方编辑" },
];

for (const style of styles) {
  const figure = document.createElement("figure");
  const caption = document.createElement("figcaption");
  caption.textContent = style.name;
  figure.append(caption, await renderPoster(payload, style.id));
  document.querySelector("main")?.append(figure);
}
document.documentElement.dataset.ready = "true";
