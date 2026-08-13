<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
### 1. Git & Commit Guidelines
- **Automatic Commits**: 每次完成一个独立的修改、页面重构或功能新增后，必须自动在终端运行 `git commit`。
- **Commit Message**: 提交信息必须规范，格式为：
  - `feat: ...` (新功能)
  - `fix: ...` (修复 Bug)
  - `refactor: ...` (代码重构)
- **Working Tree**: 保持工作区干净，确保改动不冲突。

### 2. Code Quality
- 使用 TypeScript 严格类型，禁止使用 `any`。
- 遵循 Tailwind CSS 进行样式开发，保持界面现代感与响应式适配。
