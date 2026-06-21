# Project Context

**Project**: TuiEditorHarmonyOS — 1:1 TOAST UI Editor 鸿蒙复刻
**Tech stack**: ArkTS (strict mode) + ArkUI + HarmonyOS NEXT API 12
**IDE**: DevEco Studio 26.0 (Windows)
**Build command**: Build → Run in DevEco Studio (no CLI build available)
**Test command**: DevEco Studio built-in test runner (`@ohos/hypium`)
**Package manager**: ohpm
**Lint / format**: ArkTS strict mode compiler checks
**Key conventions**:
  - Component files: `.ets` extension
  - Pure logic utilities: `.ts`
  - Classes used for @State must be `@Observed`
  - `@Link` for child-to-parent, `@Prop` for parent-to-child
  - `aboutToAppear()` for init, NOT constructor
  - `@Builder` for reusable UI (but NOT for bindPopup)
  - Comments in Chinese
  - Commit format: `type: Chinese description`

**Architecture**:
  对标 tui.editor 的三层架构：Parser（toastmark）→ EditorCore（命令/选区/事件）→ UI（工具栏/预览/分栏）。
  Editor 类对标 tui.editor 的 `Editor.factory()` 入口。插件通过 PluginManager 注入 EditorCore 能力。

**External dependencies**:
  - tui.editor JS bundle (578KB) — stored in `resources/rawfile/tui-editor/`
  - KaTeX — local bundled fonts + CSS in rawfile
  - Prism.js — local bundled JS in rawfile
  - ECharts / PlantUML — for chart/UML plugins (future)

**Known footguns**:
  - ArkTS 严格模式：无 spread、无 index access、无 Record/Map、无 any/unknown
  - 正则 `\` 转义不可靠 → 用 split/join 替代
  - bindPopup 必须在 build() 内联，不可在 @Builder 中
  - PanGesture.offsetX 累积值 → 用 delta 模式
  - WebView 只能用 loadUrl(data: URI) 不能 loadData()
  - ohpm install 在 NAS Z: 盘失败 → 必须在 F:\ 盘开发
  - 鸿蒙 WebView 8KB URL 限制

**Reference project**: `F:\MarkdownEditor` — 完整 UI 实现，有 Toolbar/SidePanel/Preview/Splitter 等组件可移植
