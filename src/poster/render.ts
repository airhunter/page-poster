import encodeQR from "qr";
import decodeQR from "qr/decode.js";
import type { PosterPayload, PosterStyle } from "../types";

const WIDTH = 1080;
const HEIGHT = 1440;
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Songti SC", "STSong", Georgia, "Times New Roman", serif';
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
export const ORIENTAL_WATERMARK = "海报摘要";

interface FittedText {
  fontSize: number;
  lines: string[];
}

interface QrRegion {
  x: number;
  y: number;
  size: number;
}

interface QrOptions {
  x: number;
  y: number;
  boxSize?: number;
  dark?: string;
  light?: string;
  border?: string;
  radius?: number;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function segments(value: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(value)].map(
      (item) => item.segment,
    );
  }
  return [...value];
}

export function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const tokens = segments(text.trim());
  const lines: string[] = [];
  let line = "";
  for (const token of tokens) {
    const next = `${line}${token}`;
    if (line && context.measureText(next).width > maxWidth) {
      if (/^[，。！？；：、）》」】』”’…,.!?;:)]/.test(token)) {
        line = next;
        continue;
      }
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

function clampLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number,
): string[] {
  if (lines.length <= maxLines) return lines;
  const result = lines.slice(0, maxLines);
  let last = result[maxLines - 1] || "";
  while (last && context.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  result[maxLines - 1] = `${last}…`;
  return result;
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    maxWidth: number;
    maxLines: number;
    startSize: number;
    minSize: number;
    weight: number;
    family: string;
  },
): FittedText {
  let fontSize = options.startSize;
  let lines: string[] = [];
  while (fontSize >= options.minSize) {
    context.font = `${options.weight} ${fontSize}px ${options.family}`;
    lines = wrapCanvasText(context, text, options.maxWidth);
    if (lines.length <= options.maxLines) break;
    fontSize -= 2;
  }
  context.font = `${options.weight} ${fontSize}px ${options.family}`;
  return {
    fontSize,
    lines: clampLines(context, lines, options.maxLines, options.maxWidth),
  };
}

function layoutTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  context.font = font;
  return clampLines(context, wrapCanvasText(context, text, maxWidth), maxLines, maxWidth);
}

function drawLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  firstBaseline: number,
  lineHeight: number,
): void {
  lines.forEach((line, index) => context.fillText(line, x, firstBaseline + index * lineHeight));
}

function splitAccent(text: string): [string, string] {
  const words = text.match(/^(.*\s)(\S+)$/u);
  if (words?.[1] && words[2]) return [words[1], words[2]];
  const characters = [...text];
  const accentLength = Math.max(2, Math.ceil(characters.length * 0.28));
  return [characters.slice(0, -accentLength).join(""), characters.slice(-accentLength).join("")];
}

function drawAccentLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  primary: string,
  accent: string,
): void {
  const [leading, ending] = splitAccent(text);
  context.fillStyle = primary;
  context.fillText(leading, x, baseline);
  context.fillStyle = accent;
  context.fillText(ending, x + context.measureText(leading).width, baseline);
}

function drawQrCode(
  context: CanvasRenderingContext2D,
  payload: string,
  options: QrOptions,
): QrRegion {
  const matrix = encodeQR(payload, "raw", { ecc: "high", border: 4 });
  const boxSize = options.boxSize ?? 164;
  const padding = 12;
  const region = {
    x: options.x - padding,
    y: options.y - padding,
    size: boxSize + padding * 2,
  };

  context.fillStyle = options.light ?? "#ffffff";
  roundedRect(context, region.x, region.y, region.size, region.size, options.radius ?? 4);
  context.fill();
  if (options.border) {
    context.strokeStyle = options.border;
    context.lineWidth = 2;
    context.stroke();
  }

  const moduleSize = Math.max(1, Math.floor(boxSize / matrix.length));
  const qrSize = moduleSize * matrix.length;
  const offsetX = options.x + Math.floor((boxSize - qrSize) / 2);
  const offsetY = options.y + Math.floor((boxSize - qrSize) / 2);
  context.fillStyle = options.dark ?? "#111111";
  matrix.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (dark) {
        context.fillRect(
          offsetX + columnIndex * moduleSize,
          offsetY + rowIndex * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    });
  });
  return region;
}

function verifyQrCode(
  context: CanvasRenderingContext2D,
  expected: string,
  region: QrRegion,
): void {
  const image = context.getImageData(region.x, region.y, region.size, region.size);
  const decoded = decodeQR({ width: image.width, height: image.height, data: image.data });
  if (decoded !== expected) {
    throw new Error("二维码生成校验失败，请换一版后重试");
  }
}

function drawSwiss(context: CanvasRenderingContext2D, payload: PosterPayload): QrRegion {
  context.fillStyle = "#f4f0e6";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#ec5138";
  context.fillRect(0, 0, 22, HEIGHT);
  context.strokeStyle = "rgba(17,21,18,.17)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(78, 0);
  context.lineTo(78, HEIGHT);
  context.stroke();

  context.save();
  context.strokeStyle = "rgba(17,21,18,.12)";
  for (let index = 0; index < 4; index += 1) {
    context.beginPath();
    context.arc(980, 170, 110 + index * 45, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "#ec5138";
  context.font = `850 18px ${MONO}`;
  context.fillText("AI EDITORIAL / PAGEPOSTER", 118, 78);

  const title = fitText(context, payload.title, {
    maxWidth: 850,
    maxLines: 3,
    startSize: 94,
    minSize: 58,
    weight: 900,
    family: SANS,
  });
  const titleLineHeight = Math.ceil(title.fontSize * 0.96);
  const titleStart = 184;
  context.font = `900 ${title.fontSize}px ${SANS}`;
  title.lines.forEach((line, index) => {
    if (title.lines.length === 1) {
      drawAccentLine(context, line, 118, titleStart, "#111512", "#ec5138");
    } else {
      context.fillStyle = index === title.lines.length - 1 ? "#ec5138" : "#111512";
      context.fillText(line, 118, titleStart + index * titleLineHeight);
    }
  });
  const titleBottom = titleStart + (title.lines.length - 1) * titleLineHeight + title.fontSize * 0.25;

  const summaryTop = Math.max(370, titleBottom + 50);
  context.fillStyle = "#111512";
  context.fillRect(118, summaryTop, 138, 38);
  context.fillStyle = "#ffffff";
  context.font = `800 17px ${SANS}`;
  context.fillText("AI 内容摘要", 136, summaryTop + 26);

  const thesisLines = layoutTextLines(
    context,
    payload.summary.thesis,
    `650 34px ${SANS}`,
    820,
    3,
  );
  context.fillStyle = "#151b18";
  context.font = `650 34px ${SANS}`;
  drawLines(context, thesisLines, 118, summaryTop + 91, 47);

  const pointsTop = Math.max(660, summaryTop + 115 + thesisLines.length * 47);
  context.strokeStyle = "#111512";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(118, pointsTop);
  context.lineTo(982, pointsTop);
  context.stroke();

  let rowY = pointsTop;
  payload.summary.points.slice(0, 3).forEach((point, index) => {
    const lines = layoutTextLines(context, point, `620 25px ${SANS}`, 730, 2);
    const rowHeight = Math.max(104, lines.length * 34 + 30);
    context.fillStyle = "#ec5138";
    context.font = `900 38px ${SANS}`;
    context.fillText(String(index + 1).padStart(2, "0"), 118, rowY + 55);
    context.fillStyle = "#242c28";
    context.font = `620 25px ${SANS}`;
    drawLines(context, lines, 216, rowY + 40, 34);
    rowY += rowHeight;
    context.strokeStyle = "rgba(17,21,18,.22)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(118, rowY);
    context.lineTo(982, rowY);
    context.stroke();
  });

  context.fillStyle = "#626962";
  context.font = `700 15px ${MONO}`;
  context.fillText("CONTENT BY AI · SOURCE", 118, 1300);
  context.fillStyle = "#111512";
  context.font = `800 29px ${SANS}`;
  context.fillText(payload.sourceDomain, 118, 1340);
  return drawQrCode(context, payload.canonicalUrl, {
    x: 824,
    y: 1208,
    boxSize: 152,
    dark: "#111512",
    border: "#111512",
    radius: 0,
  });
}

function drawSignal(context: CanvasRenderingContext2D, payload: PosterPayload): QrRegion {
  context.fillStyle = "#061812";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "rgba(128,255,170,.065)";
  context.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 72) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 72) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }

  const glow = context.createRadialGradient(920, 90, 10, 920, 90, 300);
  glow.addColorStop(0, "rgba(83,255,160,.22)");
  glow.addColorStop(1, "rgba(83,255,160,0)");
  context.fillStyle = glow;
  context.fillRect(600, 0, 480, 480);
  context.strokeStyle = "rgba(154,255,98,.32)";
  [150, 205, 270].forEach((radius) => {
    context.beginPath();
    context.arc(1020, 65, radius, 0, Math.PI * 2);
    context.stroke();
  });

  context.fillStyle = "#9aff62";
  context.font = `800 17px ${MONO}`;
  context.fillText("PAGEPOSTER://BRIEF", 76, 72);
  context.beginPath();
  context.arc(908, 66, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#dff7dc";
  context.font = `700 14px ${MONO}`;
  context.fillText("AI READY", 928, 72);

  const title = fitText(context, payload.title, {
    maxWidth: 880,
    maxLines: 3,
    startSize: 92,
    minSize: 58,
    weight: 900,
    family: SANS,
  });
  const titleLineHeight = Math.ceil(title.fontSize * 0.96);
  const titleStart = 190;
  context.font = `900 ${title.fontSize}px ${SANS}`;
  title.lines.forEach((line, index) => {
    if (title.lines.length === 1) {
      drawAccentLine(context, line, 76, titleStart, "#ffffff", "#9aff62");
    } else {
      context.fillStyle = index % 2 === 1 ? "#9aff62" : "#ffffff";
      context.fillText(line, 76, titleStart + index * titleLineHeight);
    }
  });
  const titleBottom = titleStart + (title.lines.length - 1) * titleLineHeight + title.fontSize * 0.25;

  const summaryTop = Math.max(390, titleBottom + 48);
  context.fillStyle = "rgba(8,40,30,.82)";
  context.fillRect(76, summaryTop, 928, 212);
  context.strokeStyle = "rgba(154,255,98,.5)";
  context.lineWidth = 2;
  context.strokeRect(76, summaryTop, 928, 212);
  context.fillStyle = "#9aff62";
  context.font = `800 16px ${MONO}`;
  context.fillText("01 / SYNTHESIS", 110, summaryTop + 39);
  const thesisLines = layoutTextLines(
    context,
    payload.summary.thesis,
    `650 31px ${SANS}`,
    850,
    3,
  );
  context.fillStyle = "#e5f2e4";
  context.font = `650 31px ${SANS}`;
  drawLines(context, thesisLines, 110, summaryTop + 91, 42);

  let rowY = summaryTop + 270;
  payload.summary.points.slice(0, 3).forEach((point, index) => {
    const lines = layoutTextLines(context, point, `520 24px ${SANS}`, 760, 2);
    const rowHeight = Math.max(88, lines.length * 33 + 25);
    const rowGradient = context.createLinearGradient(76, 0, 1004, 0);
    rowGradient.addColorStop(0, "rgba(154,255,98,.13)");
    rowGradient.addColorStop(1, "rgba(154,255,98,.025)");
    context.fillStyle = rowGradient;
    context.fillRect(76, rowY, 928, rowHeight);
    context.fillStyle = "#9aff62";
    context.fillRect(76, rowY, 6, rowHeight);
    context.font = `800 16px ${MONO}`;
    context.fillText(`[0${index + 1}]`, 104, rowY + 37);
    context.fillStyle = "#d6e3d9";
    context.font = `520 24px ${SANS}`;
    drawLines(context, lines, 194, rowY + 36, 33);
    rowY += rowHeight + 16;
  });

  context.strokeStyle = "rgba(154,255,98,.3)";
  context.beginPath();
  context.moveTo(76, 1174);
  context.lineTo(1004, 1174);
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = `800 25px ${MONO}`;
  context.fillText(payload.sourceDomain, 76, 1284);
  context.fillStyle = "#779988";
  context.font = `600 14px ${MONO}`;
  context.fillText("SCAN TO READ ORIGINAL", 76, 1314);
  return drawQrCode(context, payload.canonicalUrl, {
    x: 824,
    y: 1208,
    boxSize: 152,
    dark: "#082017",
    light: "#ebffd7",
    radius: 0,
  });
}

function drawCollage(context: CanvasRenderingContext2D, payload: PosterPayload): QrRegion {
  context.fillStyle = "#ead9b9";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "rgba(86,61,41,.13)";
  for (let y = 14; y < HEIGHT; y += 28) {
    for (let x = 14; x < WIDTH; x += 28) {
      context.beginPath();
      context.arc(x, y, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.save();
  context.translate(WIDTH / 2, 160);
  context.rotate(-0.045);
  context.fillStyle = "#155c72";
  context.fillRect(-590, -230, 1180, 450);
  context.fillStyle = "#e9533b";
  context.fillRect(-590, 220, 1180, 20);
  context.restore();

  context.save();
  context.translate(888, 72);
  context.rotate(0.11);
  context.strokeStyle = "#ffdf70";
  context.lineWidth = 3;
  context.strokeRect(-82, -24, 164, 48);
  context.fillStyle = "#ffdf70";
  context.font = `800 15px ${MONO}`;
  context.textAlign = "center";
  context.fillText("AI / BRIEF", 0, 6);
  context.restore();
  context.textAlign = "start";

  const title = fitText(context, payload.title, {
    maxWidth: 850,
    maxLines: 2,
    startSize: 92,
    minSize: 62,
    weight: 800,
    family: SERIF,
  });
  context.save();
  context.translate(0, 0);
  context.rotate(-0.025);
  context.fillStyle = "#fff8e8";
  context.font = `800 ${title.fontSize}px ${SERIF}`;
  context.shadowColor = "rgba(0,0,0,.18)";
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 6;
  drawLines(context, title.lines, 92, 178, Math.ceil(title.fontSize * 0.95));
  context.restore();

  const summaryTop = 405;
  const thesisLines = layoutTextLines(
    context,
    payload.summary.thesis,
    `700 32px ${SANS}`,
    820,
    3,
  );
  const summaryHeight = 92 + thesisLines.length * 44;
  context.save();
  context.translate(540, summaryTop + summaryHeight / 2);
  context.rotate(0.018);
  context.fillStyle = "rgba(54,38,26,.16)";
  context.fillRect(-450 + 14, -summaryHeight / 2 + 17, 900, summaryHeight);
  context.fillStyle = "#fff9e9";
  context.fillRect(-450, -summaryHeight / 2, 900, summaryHeight);
  context.fillStyle = "#e9533b";
  context.font = `800 17px ${SANS}`;
  context.fillText("一句话看懂", -410, -summaryHeight / 2 + 40);
  context.fillStyle = "#1c2525";
  context.font = `700 32px ${SANS}`;
  drawLines(context, thesisLines, -410, -summaryHeight / 2 + 91, 44);
  context.restore();
  context.fillStyle = "rgba(255,224,154,.82)";
  context.save();
  context.translate(180, summaryTop - 8);
  context.rotate(-0.08);
  context.fillRect(-52, -13, 104, 26);
  context.restore();
  context.save();
  context.translate(884, summaryTop + 4);
  context.rotate(0.09);
  context.fillRect(-52, -13, 104, 26);
  context.restore();

  let rowY = summaryTop + summaryHeight + 72;
  const dotColors = ["#e9533b", "#155c72", "#d9a718"];
  payload.summary.points.slice(0, 3).forEach((point, index) => {
    const lines = layoutTextLines(context, point, `650 26px ${SANS}`, 770, 2);
    const rowHeight = Math.max(92, lines.length * 36 + 26);
    context.fillStyle = dotColors[index] ?? "#e9533b";
    context.beginPath();
    context.arc(112, rowY + 27, 25, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = `850 17px ${SANS}`;
    context.textAlign = "center";
    context.fillText(String(index + 1), 112, rowY + 33);
    context.textAlign = "start";
    context.fillStyle = "#1c2525";
    context.font = `650 26px ${SANS}`;
    drawLines(context, lines, 160, rowY + 34, 36);
    context.strokeStyle = "rgba(233,83,59,.28)";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(160, rowY + rowHeight - 10);
    context.lineTo(850, rowY + rowHeight - 15);
    context.stroke();
    rowY += rowHeight + 17;
  });

  context.fillStyle = "#75654f";
  context.font = `600 15px ${SANS}`;
  context.fillText("内容由 AI 根据原文整理", 86, 1300);
  context.fillStyle = "#1c2525";
  context.font = `800 30px ${SERIF}`;
  context.fillText(payload.sourceDomain, 86, 1341);
  context.fillStyle = "#e9533b";
  context.font = `850 13px ${MONO}`;
  context.fillText("SCAN ME", 824, 1181);
  return drawQrCode(context, payload.canonicalUrl, {
    x: 824,
    y: 1208,
    boxSize: 152,
    dark: "#16201e",
    light: "#fffdf5",
    radius: 0,
  });
}

function drawOriental(context: CanvasRenderingContext2D, payload: PosterPayload): QrRegion {
  context.fillStyle = "#f6f2e7";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = "rgba(64,53,41,.045)";
  context.lineWidth = 1;
  for (let y = 24; y < HEIGHT; y += 26) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
  context.fillStyle = "#b93d2a";
  context.fillRect(52, 0, 13, HEIGHT);

  context.save();
  context.globalAlpha = 0.045;
  context.fillStyle = "#1d2422";
  context.font = `800 96px ${SERIF}`;
  [...ORIENTAL_WATERMARK].forEach((character, index) => {
    context.fillText(character, 925, 120 + index * 88);
  });
  context.restore();

  context.fillStyle = "#b93d2a";
  context.font = `800 17px ${SERIF}`;
  context.fillText("海报机 · 人工智能摘要", 112, 76);

  const title = fitText(context, payload.title, {
    maxWidth: 820,
    maxLines: 3,
    startSize: 88,
    minSize: 58,
    weight: 750,
    family: SERIF,
  });
  const titleLineHeight = Math.ceil(title.fontSize * 1.02);
  context.fillStyle = "#1d2422";
  context.font = `750 ${title.fontSize}px ${SERIF}`;
  drawLines(context, title.lines, 112, 184, titleLineHeight);
  const titleBottom = 184 + (title.lines.length - 1) * titleLineHeight + title.fontSize * 0.28;
  context.fillStyle = "#b93d2a";
  context.fillRect(112, titleBottom + 25, 126, 7);

  const summaryTop = Math.max(410, titleBottom + 92);
  context.fillStyle = "#8c9591";
  context.font = `750 16px ${SANS}`;
  context.fillText("核心观点", 112, summaryTop);
  context.fillStyle = "rgba(185,61,42,.22)";
  context.font = `900 92px ${SERIF}`;
  context.fillText("“", 76, summaryTop + 87);
  const thesisLines = layoutTextLines(
    context,
    payload.summary.thesis,
    `700 36px ${SERIF}`,
    820,
    3,
  );
  context.fillStyle = "#252c29";
  context.font = `700 36px ${SERIF}`;
  drawLines(context, thesisLines, 132, summaryTop + 61, 53);

  let rowY = Math.max(700, summaryTop + 110 + thesisLines.length * 53);
  payload.summary.points.slice(0, 3).forEach((point, index) => {
    const lines = layoutTextLines(context, point, `580 25px ${SANS}`, 750, 2);
    const rowHeight = Math.max(100, lines.length * 35 + 32);
    context.strokeStyle = "rgba(29,36,34,.2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(112, rowY);
    context.lineTo(980, rowY);
    context.stroke();
    context.fillStyle = "#b93d2a";
    context.font = `800 22px ${SERIF}`;
    context.fillText(`〇${index + 1}`, 112, rowY + 43);
    context.fillStyle = "#323936";
    context.font = `580 25px ${SANS}`;
    drawLines(context, lines, 220, rowY + 40, 35);
    rowY += rowHeight;
  });
  context.strokeStyle = "rgba(29,36,34,.2)";
  context.beginPath();
  context.moveTo(112, rowY);
  context.lineTo(980, rowY);
  context.stroke();

  context.fillStyle = "#818985";
  context.font = `600 15px ${SANS}`;
  context.fillText("来源 · 内容由 AI 整理", 112, 1300);
  context.fillStyle = "#1d2422";
  context.font = `800 29px ${SERIF}`;
  context.fillText(payload.sourceDomain, 112, 1340);
  context.strokeStyle = "#b93d2a";
  context.lineWidth = 2;
  context.strokeRect(390, 1300, 48, 48);
  context.fillStyle = "#b93d2a";
  context.font = `800 14px ${SERIF}`;
  context.fillText("海", 406, 1320);
  context.fillText("报", 406, 1338);
  return drawQrCode(context, payload.canonicalUrl, {
    x: 824,
    y: 1208,
    boxSize: 152,
    dark: "#1d2422",
    light: "#fffdf8",
    border: "#b93d2a",
    radius: 0,
  });
}

export async function renderPoster(
  payload: PosterPayload,
  style: PosterStyle = "swiss",
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("当前浏览器无法创建海报画布");

  const qrRegion =
    style === "signal"
      ? drawSignal(context, payload)
      : style === "collage"
        ? drawCollage(context, payload)
        : style === "oriental"
          ? drawOriental(context, payload)
          : drawSwiss(context, payload);
  verifyQrCode(context, payload.canonicalUrl, qrRegion);
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 导出失败"));
    }, "image/png");
  });
}
