#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const releaseZipWarningBytes = 1_500_000;
const extractorReviewBytes = 300 * 1024;
const releaseGrowthReviewRatio = 0.15;
const expectedAssetPattern = ".output/PagePoster-v${version}-chrome.zip";
const args = process.argv.slice(2);
let versionArg;
let checkZip = false;

for (const arg of args) {
  if (arg === "--check-zip") {
    checkZip = true;
  } else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (!versionArg) {
    versionArg = arg.replace(/^v/, "");
  } else {
    fail(`未知参数: ${arg}`);
  }
}

const root = process.cwd();
const packageJson = readJson("package.json");
const version = versionArg ?? packageJson.version;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`版本号格式不正确: ${version}`);
}

if (!fs.existsSync(path.join(root, "CHANGELOG.md"))) {
  fail("缺少 CHANGELOG.md");
}

const releaseIt = readJson(".release-it.json");
if (releaseIt.git?.requireCleanWorkingDir !== true) {
  fail(".release-it.json 需要开启 git.requireCleanWorkingDir");
}

if (releaseIt.github?.release !== true) {
  fail(".release-it.json 需要开启 github.release");
}

if (!Array.isArray(releaseIt.github.assets) || !releaseIt.github.assets.includes(expectedAssetPattern)) {
  fail(`.release-it.json 需要上传 ${expectedAssetPattern}`);
}

const expectedAfterBump = "pnpm verify && pnpm zip && pnpm release:check ${version} --check-zip";
if (releaseIt.hooks?.["after:bump"] !== expectedAfterBump) {
  fail(`.release-it.json 需要在 after:bump 执行 ${expectedAfterBump}`);
}

const changelogPlugin = releaseIt.plugins?.["@release-it/conventional-changelog"];
if (changelogPlugin?.infile !== "CHANGELOG.md") {
  fail(".release-it.json 需要使用 conventional changelog 维护 CHANGELOG.md");
}

const wxtConfig = readText("wxt.config.ts");
if (!/zip:\s*\{[\s\S]*?name:\s*["']PagePoster["']/.test(wxtConfig)) {
  fail("wxt.config.ts 需要把 ZIP 产物名称配置为 PagePoster");
}

if (!/artifactTemplate:\s*["']\{\{name\}\}-v\{\{version\}\}-\{\{browser\}\}\.zip["']/.test(wxtConfig)) {
  fail("wxt.config.ts 的 ZIP 文件名需要包含 name、version 和 browser");
}

if (checkZip) {
  checkReleaseZip(version);
}

console.log(`release readiness check passed for v${version}`);

function checkReleaseZip(targetVersion) {
  const relativeZip = `.output/PagePoster-v${targetVersion}-chrome.zip`;
  const zipPath = path.join(root, relativeZip);
  if (!fs.existsSync(zipPath)) {
    fail(`缺少打包产物: ${relativeZip}，请先运行 pnpm zip`);
  }

  const archive = readZipArchive(zipPath);
  const entryNames = new Set(archive.entries.map((entry) => entry.name));
  const requiredEntries = ["manifest.json", "popup.html", "options.html", "background.js", "extractor.js"];
  const missingEntries = requiredEntries.filter((entry) => !entryNames.has(entry));
  if (missingEntries.length > 0) {
    fail(`发布 ZIP 缺少必要文件: ${missingEntries.join(", ")}`);
  }

  const forbiddenEntries = archive.entries
    .map((entry) => entry.name)
    .filter((name) => name.includes("node_modules/") || /(^|\/)\.env(?:\.|$)/.test(name) || name.endsWith(".map"));
  if (forbiddenEntries.length > 0) {
    fail(`发布 ZIP 包含不应发布的文件: ${forbiddenEntries.join(", ")}`);
  }

  const manifest = JSON.parse(readZipEntry(archive, "manifest.json").toString("utf8"));
  if (manifest.version !== targetVersion) {
    fail(`ZIP 内 manifest 版本为 ${manifest.version}，预期为 ${targetVersion}`);
  }

  if (manifest.manifest_version !== 3) {
    fail(`ZIP 内 manifest_version 为 ${manifest.manifest_version}，预期为 3`);
  }

  if (manifest.name !== "海报机 PagePoster") {
    fail(`ZIP 内扩展名称为 ${manifest.name}，预期为 海报机 PagePoster`);
  }

  checkArtifactSize(zipPath, archive);
}

function checkArtifactSize(zipPath, archive) {
  const zipBytes = fs.statSync(zipPath).size;
  console.log(`artifact size: ZIP ${formatMb(zipBytes)} MB / 1.50 MB`);
  if (zipBytes > releaseZipWarningBytes) {
    warn(`发布 ZIP 为 ${formatMb(zipBytes)} MB，超过 1.50 MB，请检查构建内容`);
  }

  const extractor = archive.entries.find((entry) => entry.name === "extractor.js");
  if (extractor) {
    console.log(`artifact size: extractor.js ${formatKib(extractor.uncompressedSize)} KiB / 300.0 KiB`);
    if (extractor.uncompressedSize > extractorReviewBytes) {
      warn(`extractor.js 为 ${formatKib(extractor.uncompressedSize)} KiB，超过 300.0 KiB，请审查注入页面的代码`);
    }
  }

  const previousZip = findPreviousZip(zipPath);
  if (!previousZip) {
    console.log("artifact growth: 无上一版本产物，跳过增长检查");
    return;
  }

  const previousBytes = fs.statSync(previousZip).size;
  const growthRatio = previousBytes === 0 ? 0 : (zipBytes - previousBytes) / previousBytes;
  const growthPercent = (growthRatio * 100).toFixed(1);
  console.log(`artifact growth: ${path.basename(previousZip)} -> ${path.basename(zipPath)} ${growthPercent}% / 15.0%`);
  if (growthRatio > releaseGrowthReviewRatio) {
    warn(`发布 ZIP 相比上一产物增长 ${growthPercent}%，超过 15.0%，请检查构建内容`);
  }
}

function findPreviousZip(currentZip) {
  const outputDir = path.dirname(currentZip);
  if (!fs.existsSync(outputDir)) {
    return undefined;
  }

  const candidates = fs.readdirSync(outputDir)
    .filter((name) => /^PagePoster-v.+-chrome\.zip$/.test(name))
    .map((name) => path.join(outputDir, name))
    .filter((candidate) => candidate !== currentZip)
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  return candidates[0];
}

function readZipArchive(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset === -1) {
    fail(`无法读取 ZIP 中央目录: ${path.relative(root, zipPath)}`);
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== centralSignature) {
      fail(`ZIP 中央目录损坏: ${path.relative(root, zipPath)}`);
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileNameStart = offset + 46;
    const name = buffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString("utf8");

    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset = fileNameStart + fileNameLength + extraLength + commentLength;
  }

  return { buffer, entries, zipPath };
}

function readZipEntry(archive, name) {
  const entry = archive.entries.find((item) => item.name === name);
  if (!entry) {
    fail(`ZIP 中缺少 ${name}`);
  }

  const localSignature = 0x04034b50;
  const offset = entry.localHeaderOffset;
  if (archive.buffer.readUInt32LE(offset) !== localSignature) {
    fail(`ZIP 本地文件头损坏: ${name}`);
  }

  const fileNameLength = archive.buffer.readUInt16LE(offset + 26);
  const extraLength = archive.buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = archive.buffer.subarray(dataStart, dataStart + entry.compressedSize);
  let result;

  if (entry.method === 0) {
    result = compressed;
  } else if (entry.method === 8) {
    result = inflateRawSync(compressed);
  } else {
    fail(`ZIP 条目 ${name} 使用了不支持的压缩方式: ${entry.method}`);
  }

  if (result.length !== entry.uncompressedSize) {
    fail(`ZIP 条目 ${name} 解压后大小不一致`);
  }
  return result;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function formatMb(bytes) {
  return (bytes / 1_000_000).toFixed(2);
}

function formatKib(bytes) {
  return (bytes / 1024).toFixed(1);
}

function warn(message) {
  console.warn(`warning: ${message}`);
}

function fail(message) {
  console.error(`release readiness check failed: ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log("Usage: pnpm release:check [version] [--check-zip]");
}
