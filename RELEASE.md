# 发布流程

PagePoster 使用 `release-it` 管理版本号、`CHANGELOG.md`、Git tag 和 GitHub Release，使用 WXT 生成 Chrome Web Store 发布包。

## 发布前准备

1. 确认工作区干净，并查看基于 Conventional Commits 推导的下一个版本：

```bash
git status --short
pnpm exec release-it --release-version
```

也可以直接指定目标版本，例如 `0.2.0`。

2. 检查目标版本和发布配置：

```bash
pnpm release:check 0.2.0
```

3. 运行完整验证：

```bash
pnpm verify
```

`pnpm verify` 会执行类型检查、完整测试和 WXT 正式构建。

4. 检查当前 `package.json` 版本对应的 ZIP：

```bash
pnpm zip
pnpm release:check --check-zip
```

该检查会验证：

- ZIP 文件名与版本号一致。
- ZIP 内 `manifest.json` 的版本、扩展名称和 Manifest V3 配置正确。
- Popup、设置页、后台脚本和正文提取脚本均已进入发布包。
- 发布包不包含 `.env`、`node_modules` 或 source map。
- ZIP、正文提取脚本和相邻版本增长没有超出需要人工复核的体积预算。

正式发布时，`release-it` 会先提升 `package.json` 版本，再自动运行 `pnpm zip` 和目标版本的完整产物检查。检查失败会发生在 release commit、Tag 和 GitHub Release 创建之前。

## 预演

在工作区干净时，可以预览 release-it 将执行的操作：

```bash
pnpm release:dry-run
```

指定版本预演：

```bash
pnpm release:dry-run -- 0.2.0
```

## 正式发布

交互式选择版本：

```bash
pnpm release
```

指定版本并以非交互方式发布：

```bash
pnpm release -- 0.2.0 --ci
```

首次发布时，如果 `package.json` 已经是目标版本 `0.1.0`，使用当前版本创建首个 Tag 和 Release：

```bash
pnpm release -- --no-increment
```

正式发布会：

- 更新 `package.json` 版本。
- 根据 Conventional Commits 更新 `CHANGELOG.md`。
- 运行完整验证、生成并检查目标版本 ZIP。
- 创建 `chore(release): v<version>` 提交。
- 创建并推送 `v<version>` Tag。
- 创建 GitHub Release。
- 上传 `.output/PagePoster-v<version>-chrome.zip`。

`pnpm release` 默认从现有的 `GITHUB_TOKEN` 读取凭证；未设置时会调用 `gh auth token`。Token 不会写入项目文件。

Windows PowerShell 如果不能执行脚本中的环境变量语法，可使用：

```powershell
$env:GITHUB_TOKEN=(gh auth token); pnpm exec release-it 0.2.0 --ci
```

## 发布后核对

```bash
gh release view v<version> --repo airhunter/page-poster
git status --short
```

确认 GitHub Release 已发布、ZIP 附件存在、本地工作区干净，并将扩展包提交至 Chrome Web Store。
