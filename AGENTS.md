# Project Instructions

## Git Commit Messages

本项目使用 `release-it` 和 `@release-it/conventional-changelog` 生成版本号与 `CHANGELOG.md`，所有提交必须使用 Conventional Commits：

```text
<type>(<scope>): <subject>
```

- 新功能使用 `feat`，问题修复使用 `fix`，性能优化使用 `perf`。
- 其他变化按需使用 `docs`、`test`、`build`、`ci`、`refactor` 或 `chore`。
- scope 使用简短的小写英文，例如 `popup`、`options`、`poster`、`release`。
- subject、正文与备注使用简洁中文，subject 末尾不加标点。
- 破坏性变化使用 `<type>!: <subject>`，或添加 `BREAKING CHANGE:` footer。

## Engineering Workflow

- 修改用户可见行为、海报布局、内容提取、模型请求或发布流程前，先说明关键假设和验证方式。
- 优先使用现有实现、浏览器原生能力和已有依赖，保持改动聚焦。
- 不为减少代码量而牺牲输入校验、错误处理、安全、可访问性或必要测试。
- 不修改与当前任务无关的文件；发现无关问题时在交付说明中单独指出。

## Testing Expectations

- 行为变化需要新增或更新聚焦测试。
- 日常完整检查使用 `pnpm verify`，它会执行类型检查、完整测试和正式构建。
- 发布前必须运行 `pnpm verify`、生成 ZIP，并通过 `pnpm release:check <version> --check-zip`。
- 无法自动验证的视觉变化需要提供简短的手动检查项。

## Release Workflow

- 发布时以 `RELEASE.md` 为唯一流程准则。
- 使用 `release-it` 统一更新版本号、生成 `CHANGELOG.md`、创建 release commit、Git tag 和 GitHub Release。
- 发布产物固定为 `.output/PagePoster-v<version>-chrome.zip`，由 WXT 生成。
- 不手工修改 Git tag、GitHub Release 或发布包文件名来绕过发布检查。
- GitHub Token 只通过 `GITHUB_TOKEN` 环境变量或 `gh auth token` 提供，禁止写入源码和配置。
