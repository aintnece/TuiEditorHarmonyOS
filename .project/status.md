# Project Status: TuiEditorHarmonyOS

**Last updated**: 2026-06-23 (Phase 5 批次 1+2 完成 — 引擎已 vendoring + WwEditor WebView 容器就绪，待真机验证 WebView 输入。下一步批次 3 JS 桥)

## Summary

Phase 1-4.8 完成。编辑器已具备：解析器 + EditorCore + Toolbar(含保存按钮 Feather SVG) + MdEditor + MdPreview + Splitter + LinkEditor + ImageEditor + PopupMenu + ContextMenu + SidePanel + StatusBar + ExportSheet + FileService(真实文件 I/O)。
**保存功能根因修复**：`fs.accessSync` 返回 boolean 不抛异常，旧代码恒判定文件存在导致 createFile 去重死循环。

## Completed

### Phase 1: 基础设施
- [x] DDD 追踪系统初始化（.project/）
- [x] EventEmitter 补全（emit bug fix + emitReduce + getEvents）
- [x] ThemeService 补全（28 颜色 Token + preferences + common.Context 类型修复）
- [x] I18n 补全（~110 key + 日/韩 + 英文回退 + 持久化）

### Phase 2: 解析器
- [x] ParseState + Blocks + Inlines + Gfm 四模块拆分
- [x] CommonMark 补全 + GFM 补全 + AST 类型补全
- [x] HtmlRenderer 补全（6 种新节点渲染 + String→string 类型修复）
- [x] ToastMark 重构为薄层入口

### Phase 3: EditorCore
- [x] EditorType / Selection / CommandManager / MarkdownCommands
- [x] EditorCore 主协调器 + Editor 入口类（Editor.factory()）
- [x] EditorPage 接入 Editor + app.ets 偏好初始化

### Phase 4
- [x] **4.1**: Toolbar 工具栏（22 按钮 + Feather Icons + bindPopup→Stack tooltip + 模式切换）
- [x] **4.2**: MdEditor 编辑器组件（TextArea + 行号标尺 + EditorCore 光标同步）
- [x] **4.3**: MdPreview 预览组件（WebView + runJavaScript 无闪烁更新 + KaTeX 本地拦截）
- [x] **4.4**: Splitter 可拖拽分栏（PanGesture delta 模式 + 像素宽度布局）
- [x] **4.5**: PopupMenu / LinkEditor / ImageEditor（链接/图片弹窗 + 表格操作菜单）
- [x] **4.6**: ContextMenu 右键菜单（6 项：复制/剪切/粘贴/全选/撤销/重做，pasteboard 剪贴板集成）
- [x] **4.7**: SidePanel + StatusBar + ExportSheet ✅ (编译通过)
- [x] **4.8**: EditorPage 完整集成（文件 I/O、新建/打开/保存/导出）✅

### Bug 修复
- [x] undo snapshot — CommandManager.undo() 改用全快照
- [x] bindPopup 移除 — 32px 按钮 bindPopup 需要双击；改为 Stack + position() 内联 tooltip
- [x] EditorContext 单例 — 解决 @Prop 无法传递 class 实例；全局 editorContext 单例
- [x] selection 回退 — lastSelectionStart/lastSelectionEnd 保存最后有效选区
- [x] Feather Icons — 16 个 SVG 图标替换文本标签
- [x] 诊断日志清理 — 移除所有临时 hilog 调试日志（7 文件清理完毕）
- [x] 保存按钮不可见 — `Button('💾')` emoji 不渲染，改用 Feather SVG
- [x] 保存按钮卡死 — `O_TRUNC=128` 错误值（应为 512），改用 `fs.OpenMode.TRUNC` 枚举
- [x] 保存按钮 UI 重构 — 从标题栏迁移至 Toolbar，统一 Feather SVG 风格（含 hover 态）
- [x] 保存功能根因 — `fs.accessSync` 返回 boolean 不抛异常（旧代码恒判定存在→createFile 死循环），真机验证通过
- [x] SidePanel 保存后刷新 — refreshToken @Prop+@Watch，保留当前文件高亮
- [x] TuiSave 诊断日志清理 — FileService(17处)+EditorPage(10处) 移除，保留 app.ets 正常日志

### Phase 5: WYSIWYG 模式（方案 B：WebView + tui.editor 引擎）
- [x] **5.1**: 引擎打包 — @toast-ui/editor v3.2.2 dist vendoring 到 `rawfile/tui-editor/`（min.js 350KB 含 ProseMirror + 主/暗 CSS，离线自包含）
- [x] **5.2**: WwEditor.ets WebView 容器 + `rawfile/tui-editor/editor.html` — 自定义域名 `https://wweditor.local` + onInterceptRequest 从 rawfile 加载、focusable(true) 可输入、`window.__ww` 桥 API、主题适配。**✅ 真机验证通过**（修了 2 个坑：onInterceptRequest 未剥 query → 白屏；选错 bundle externalize prosemirror → not a constructor，改用 uicdn -all 全打包版。均录入 Obsidian）

## In Progress

**Phase 5 批次 3: ArkTS↔JS 桥** — ✅ 已实现（onChange 回写 core + exec 原语 + registerJavaScriptProxy），真机已验证「打字→切 Markdown 看到改动」。**含真机修复**：①加载文件误标脏 ②WYSIWYG 切文件不刷新（loadToken）③**异步 change 根因修**：tui.editor 的 change 异步触发，同步 suppressChange 拦不住 → 导致误标脏 + 延迟 onChange 写回旧内容串台（幽灵文字）；改用 `lastSetMd` 内容比对（cur===lastSetMd 即程序化设值，忽略）。**待真机复验**。详见 `.project/batch3-fix-spec.md`。

**待真机验证（批次 2 遗留）**：WebView 内 contenteditable 的输入法/光标行为（active-task 标记的最大设备风险）。

## Next

- Phase 5 批次 3: ArkTS↔JS 桥（registerJavaScriptProxy onChange/selection 回传 + runJavaScript 命令）
- Phase 5 批次 4: Markdown 双向转换 + 模式切换同步（MdEditor ↔ WwEditor 内容互传）
- Phase 5 批次 5: 集成 EditorPage（替换占位符 603-612 行）+ Toolbar 命令在 WYSIWYG 下走 WebView 桥
- Phase 6: Toolbar 增强 + 更多 Markdown 命令（Phase 5 后）

## Known Issues

- WYSIWYG 模式：EditorPage 已渲染 WwEditor（占位符已替换），但**编译/真机未验证**；内容回传(批次3)+双向同步(批次4)未做，WYSIWYG 编辑暂不回写 markdown
- 解析器未跑 CommonMark spec 测试套件（Phase 8）
- `pushUrl` deprecated (2×) — 不阻塞编译（Index.ets）
- `getParams` deprecated — 不阻塞编译（EditorPage.ets）
- `clip` API SDK 12+ — 需要 bump compatibleSdkVersion 或 apiAvailable 守卫（MdEditor.ets）
- `request` API SDK 12+ — 同上（MdPreview.ets）
- `getContext` deprecated — 不阻塞编译（MdPreview.ets）
- Splitter `@Link splitRatio` 绑定语法修复：`$splitRatio`（非 `$this.splitRatio`）

## Reference Project

`F:\MarkdownEditor` — 完整 UI 组件资产库

## 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `.project/` | 新建 | DDD 追踪系统 |
| `event/EventEmitter.ts` | 修改 | invokeReduce 修复 |
| `services/ThemeService.ts` | 修改 | context 类型修复 |
| `i18n/I18n.ts` | 修改 | context 类型修复 |
| `parser/commonmark/Node.ts` | 修改 | alignments String→string |
| `parser/commonmark/Gfm.ts` | 修改 | aligns String→string |
| `parser/html/Renderer.ts` | 修改 | String→string 类型修复 |
| `editor/EditorCore.ts` | 修改 | Handler 类型修复 + 诊断日志清理 |
| `editor/Editor.ts` | 修改 | Handler + context 类型修复 |
| `editor/EditorContext.ts` | **新建** | 全局 editorContext 单例（@Prop 替代方案） |
| `editor/EditorType.ts` | 修改 | 新增 lastSelectionStart/lastSelectionEnd 字段 |
| `editor/markdown/MdEditor.ets` | **新建** | 行号标尺 + 光标同步 + 诊断日志清理 |
| `editor/markdown/MdPreview.ets` | **新建** | WebView 预览 + KaTeX + 诊断日志清理 |
| `editor/commands/commands/MarkdownCommands.ts` | 修改 | selection fallback + 诊断日志清理 |
| `components/Toolbar.ets` | 修改 | Editor 默认值修复 + onLink/onImage/onTable 回调 + Feather Icons + 诊断日志清理 |
| `components/Splitter.ets` | **新建** | PanGesture 可拖拽分栏（@Link splitRatio 绑定） |
| `components/LinkEditor.ets` | **新建** | 链接编辑弹窗（URL + 文本） |
| `components/ImageEditor.ets` | **新建** | 图片插入弹窗（URL + alt） |
| `components/PopupMenu.ets` | **新建** | 表格操作弹出菜单（9 项操作 + 中/英） |
| `components/ContextMenu.ets` | **新建** | 右键/长按上下文菜单（6 项 + pasteboard 集成） |
| `pages/EditorPage.ets` | 修改 | 集成三模式布局 + Splitter + 对话框 Stack 遮罩层 + 回调处理 + ContextMenu + 诊断日志清理 |
| `pages/Index.ets` | 修改 | 诊断日志清理 |
| `entry/src/main/module.json5` | 修改 | deliveryWithInstall + skills + 权限 |
| `resources/*/element/string.json` | 修改 | +2 权限说明 key |
| `resources/rawfile/katex/` | **新建** | KaTeX 完整资源（CSS/JS/字体） |
| `resources/base/media/tui_*.svg` | **新建** | 16 个 Feather Icons SVG（粗体/斜体/删除线/代码/标题/引用/列表/链接/图片/表格/分割线/代码块/任务/撤销/重做） |
| `editor/markdown/WwEditor.ets` | **新建** | Phase 5 WYSIWYG WebView 容器（tui.editor 引擎，onInterceptRequest 从 rawfile 加载，focusable(true)，window.__ww 桥） |
| `resources/rawfile/tui-editor/` | **新建** | Phase 5 引擎资产：toastui-editor.min.js(350KB) + toastui-editor.min.css + toastui-editor-dark.css + editor.html（离线初始化页） |
