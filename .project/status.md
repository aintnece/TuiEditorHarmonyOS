# Project Status: TuiEditorHarmonyOS

**Last updated**: 2026-06-21 (Session 3 — Phase 4.5 完成，编译修复)

## Summary

Phase 1-4.5 完成。31 个文件就绪。
编辑器已具备：解析器 + EditorCore + Toolbar(20+ 按钮) + MdEditor(行号标尺) + MdPreview(WebView预览+KaTeX) + Splitter(可拖拽分栏) + LinkEditor(链接弹窗) + ImageEditor(图片弹窗) + PopupMenu(表格操作菜单)。
**准备进入 Phase 4.6：ContextMenu 右键菜单。**

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
- [x] **4.1**: Toolbar 工具栏（22 按钮 + bindPopup 防抖 + 模式切换）
- [x] **4.2**: MdEditor 编辑器组件（TextArea + 行号标尺 + EditorCore 光标同步）
- [x] **4.3**: MdPreview 预览组件（WebView + runJavaScript 无闪烁更新 + KaTeX 本地拦截）
- [x] **4.4**: Splitter 可拖拽分栏（PanGesture delta 模式 + 像素宽度布局）
- [x] **4.5**: PopupMenu / LinkEditor / ImageEditor（链接/图片弹窗 + 表格操作菜单）
- [ ] **4.6**: ContextMenu 右键菜单
- [ ] **4.7**: SidePanel + StatusBar + ExportSheet
- [ ] **4.8**: EditorPage 完整集成

## In Progress

**Phase 4.5** — 链接/图片弹窗 + 表格操作菜单已完成，待编译验证
**Next**: Phase 4.6（ContextMenu 右键菜单）

## Known Issues

- WYSIWYG 模式仍为占位符（Phase 5）
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
| `editor/EditorCore.ts` | 修改 | Handler 类型修复 |
| `editor/Editor.ts` | 修改 | Handler + context 类型修复 |
| `editor/markdown/MdEditor.ets` | **新建** | 行号标尺 + 光标同步 |
| `editor/markdown/MdPreview.ets` | **新建** | WebView 预览 + KaTeX |
| `components/Toolbar.ets` | 修改 | Editor 默认值修复 + onLink/onImage/onTable 回调 |
| `components/Splitter.ets` | **新建** | PanGesture 可拖拽分栏（@Link splitRatio 绑定） |
| `components/LinkEditor.ets` | **新建** | 链接编辑弹窗（URL + 文本） |
| `components/ImageEditor.ets` | **新建** | 图片插入弹窗（URL + alt） |
| `components/PopupMenu.ets` | **新建** | 表格操作弹出菜单（9 项操作 + 中/英） |
| `pages/EditorPage.ets` | 修改 | 集成三模式布局 + Splitter + 对话框 Stack 遮罩层 + 回调处理 |
| `entry/src/main/module.json5` | 修改 | deliveryWithInstall + skills + 权限 |
| `resources/*/element/string.json` | 修改 | +2 权限说明 key |
| `resources/rawfile/katex/` | **新建** | KaTeX 完整资源（CSS/JS/字体） |
