# Privacy practices 后台填写稿

以下内容按 Chrome Web Store 开发者后台的字段组织，可直接复制。最终选项必须与提交 ZIP 的实际行为保持一致。

## 单一用途说明

在用户主动点击后读取当前公开文章，使用用户配置的 AI 服务生成中文摘要，并将标题、摘要、来源域名和原文二维码排版为可复制或下载的分享海报。

## 权限理由

### `activeTab`

仅在用户打开扩展并点击“生成海报”后，临时访问当前活动标签页，以读取该公开文章的 URL、标题和正文。扩展不会使用此权限在后台持续读取标签页。

### `scripting`

在用户主动生成时，向当前活动标签页按需注入随扩展打包的正文提取脚本。脚本使用 Mozilla Readability 提取文章内容；不会注入远程脚本，也不会在所有网站上常驻运行。

### `storage`

使用 `chrome.storage.local` 在本机保存用户配置的 API 地址、API Key、模型和海报风格；使用 `chrome.storage.session` 暂存当前浏览器会话中的文章、摘要和生成状态，以便关闭并重新打开弹窗后恢复任务。设置不通过 Chrome 同步。

### `clipboardWrite`

当用户在海报预览中点击“复制海报”时，将生成的 PNG 写入系统剪贴板，方便粘贴到聊天或文档。写入只发生在明确的用户操作之后。

### 可选主机权限 `https://*/*`

用户可以配置自己的 OpenAI 兼容 HTTPS API 地址。保存或测试设置时，扩展只请求该用户指定 API origin 的运行时权限，用于获取模型列表和请求摘要；更换地址后会移除旧 origin 的权限。扩展不会一次性请求访问所有 HTTPS 网站。

## 远程代码

选择：`No, I am not using remote code.`

理由（如后台提供补充文本）：

所有可执行 JavaScript、Mozilla Readability 和二维码库均随扩展打包。扩展会向用户配置的 AI API 发送 HTTPS 数据请求，但只把响应作为 JSON 文本解析，不下载或执行远程代码。

## 数据类型

建议保守勾选以下类型：

- `Authentication information`：用户填写的 API Key 在本机处理和保存，并作为 Bearer 凭据发送到用户配置的 API origin。
- `Web history`：用户主动处理的当前页面 URL/规范 URL 会在浏览器会话中暂存，并编码进海报二维码。
- `Website content`：当前文章的标题、描述、章节标题和正文片段会被提取；文章内容会发送到用户配置的 AI 服务生成摘要。

不勾选：个人身份、健康、财务与支付、私人通信、位置、用户活动、广告分析等其他类型；当前版本没有对应处理行为。

## 数据使用与共享说明

- 文章内容只用于生成用户请求的摘要和海报。
- 文章内容直接发送给用户自行配置的 AI 服务商，不经过 PagePoster 开发者服务器。
- API Key 只发送到用户配置的 API origin，不发送给 PagePoster 开发者。
- 当前页面的候选文章图片可能由扩展在无 Cookie、无 Referer 的条件下从原网页或其图片 CDN 获取，仅用于海报排版。
- 不出售数据，不用于广告、信用评估、个性化推荐或与扩展单一用途无关的分析。
- 不允许人工查看用户内容；PagePoster 开发者没有接收这些内容的服务器。

## Limited Use 认证

勾选后台展示的全部 Limited Use 合规声明，前提是最终提交版本与上述行为一致。隐私政策中已包含以下等价声明：

> 对从浏览器权限获得的信息，PagePoster 的使用遵守 Chrome Web Store User Data Policy（包括 Limited Use 要求）；数据仅用于用户可见的单一功能，不用于广告或与该功能无关的用途。

## 隐私政策 URL

`https://github.com/airhunter/page-poster/blob/main/docs/chrome-web-store/privacy-policy.zh-CN.md`

该文件必须先提交并推送到公开仓库。提交商店前，请用无登录窗口检查 URL 可访问性。
