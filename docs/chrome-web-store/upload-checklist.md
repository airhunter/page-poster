# Chrome Web Store 提交清单

## 账号与版本

- [ ] 开发者账号完成注册、身份与联系邮箱验证。
- [ ] 工作区干净，目标版本已按 `RELEASE.md` 生成。
- [ ] `pnpm verify` 通过。
- [ ] `pnpm zip` 成功。
- [ ] `pnpm release:check <version> --check-zip` 通过。
- [ ] 上传 `.output/PagePoster-v<version>-chrome.zip`，不上传源码仓库压缩包。

## Store listing

- [ ] 名称和简短说明与 Manifest 一致。
- [ ] 主要语言选择中文（简体）。
- [ ] 分类选择 Workflow & Planning。
- [ ] 粘贴 `listing.zh-CN.md` 中的详细说明。
- [ ] 按 `README.md` 的顺序上传 5 张 1280 × 800 截图。
- [ ] 上传 440 × 280 小宣传图。
- [ ] 上传 1400 × 560 横幅宣传图。
- [ ] 首页、支持和隐私政策 URL 可在未登录状态访问。
- [ ] Mature content 选择否。

## Privacy practices

- [ ] 粘贴单一用途说明。
- [ ] 为 `activeTab`、`scripting`、`storage`、`clipboardWrite` 和可选主机权限逐项填写理由。
- [ ] 远程代码选择否。
- [ ] 数据类型至少勾选 Authentication information、Web history、Website content。
- [ ] 数据用途与共享勾选项和隐私政策一致。
- [ ] 完成全部 Limited Use 认证。
- [ ] 填写公开隐私政策 URL。

## 审核测试

- [ ] 在受保护字段提供限额、可撤销的临时 HTTPS API 凭据和模型名。
- [ ] 使用干净 Chrome 配置从商店安装包测试首次配置。
- [ ] 在至少一篇公开中文文章和一篇公开英文文章上生成成功。
- [ ] 验证同一 URL 重开弹窗不会重复请求 AI。
- [ ] 验证“换一版”会重新生成摘要。
- [ ] 验证 4 种风格都能输出 1080 × 1440 PNG。
- [ ] 验证复制；在剪贴板不可用时验证下载后备入口。
- [ ] 用另一台设备扫描二维码，确认指向清理跟踪参数后的原文 URL。
- [ ] 验证 PDF、本机/局域网/内网页面会被拒绝。
- [ ] 撤销审核临时 Key。

## 发布策略

- [ ] 首次提交先选择 Unlisted。
- [ ] 审核通过后从真实商店页面安装并复测。
- [ ] 确认支持渠道和隐私政策上线后切换 Public。
- [ ] 发布后记录商店 Item ID 和公开 URL，补充到项目文档。
