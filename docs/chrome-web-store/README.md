# Chrome Web Store 上架素材包

本目录包含「海报机 PagePoster」首次上架 Chrome Web Store 所需的文案、审核说明、隐私政策和图片素材。

## 直接上传的图片

| 文件 | 尺寸 | 用途 |
| --- | ---: | --- |
| `assets/icon-128.png` | 128 × 128 | 商店图标 |
| `assets/screenshot-01-generate.png` | 1280 × 800 | 主流程：文章生成海报 |
| `assets/screenshot-02-workflow.png` | 1280 × 800 | 文章、摘要、海报三步流程 |
| `assets/screenshot-03-styles.png` | 1280 × 800 | 四套海报风格 |
| `assets/screenshot-04-settings.png` | 1280 × 800 | 模型连接与本机设置 |
| `assets/screenshot-05-privacy.png` | 1280 × 800 | 主动触发与数据流 |
| `assets/promo-small-440x280.png` | 440 × 280 | 小宣传图（必填） |
| `assets/promo-marquee-1400x560.png` | 1400 × 560 | 横幅宣传图（可选） |

建议按上表顺序上传 5 张截图。宣传图不做本地化，文案因此保持很短。

## 可直接复制的后台字段

- `listing.zh-CN.md`：商店标题、摘要、详细说明、分类、链接和发布范围。
- `privacy-practices.zh-CN.md`：单一用途、各项权限理由、数据类型和认证选项。
- `reviewer-notes.zh-CN.md`：给审核人员的测试步骤、功能边界和测试配置说明。
- `privacy-policy.zh-CN.md`：需要公开托管并填入后台的隐私政策正文。
- `upload-checklist.md`：从 ZIP 到提交审核的逐项清单。

## 发布前必须替换或确认

1. 将隐私政策提交到默认分支后，确认公开 URL 可以在未登录状态下访问。
2. 用 Chrome Web Store 开发者账号中真实的支持邮箱替换后台占位信息。
3. 为审核人员提供一个受限、可撤销的 HTTPS 测试 API Key 和可用模型名；不要把凭据写入仓库或审核备注。
4. 确认最终 ZIP 版本与商店提交版本一致，并在干净的 Chrome 配置中走完生成、复制、二维码扫码流程。

## 素材来源

界面、海报和图标均来自当前项目实现。宣传图背景由 OpenAI 内置 ImageGen 生成，最终文字、图标和产品画面在本地确定性排版，生成提示词记录在 `source/IMAGEGEN-PROMPT.md`。
