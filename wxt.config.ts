import { defineConfig } from "wxt";

const icons = {
  16: "/icons/icon-16.png",
  32: "/icons/icon-32.png",
  48: "/icons/icon-48.png",
  128: "/icons/store-icon-128.png",
};

export default defineConfig({
  srcDir: "src",
  publicDir: "src/assets",
  manifest: {
    name: "海报机 PagePoster",
    description: "一键把公开文章变成带 AI 摘要和二维码的分享海报。",
    minimum_chrome_version: "116",
    icons,
    permissions: ["activeTab", "scripting", "storage", "clipboardWrite"],
    optional_host_permissions: ["https://*/*"],
    action: {
      default_icon: icons,
    },
  },
  zip: {
    name: "PagePoster",
    artifactTemplate: "{{name}}-v{{version}}-{{browser}}.zip",
  },
});
