# Active Task

## Objective

**Phase 5: WYSIWYG 模式** — 架构方案 B（WebView + ProseMirror 引擎）

> 本任务为大工程，分多批次交给 CC。本文件是新会话恢复入口。

## 架构决策（已拍板：方案 B）

WYSIWYG 走 **WebView + 真实 ProseMirror/tui.editor 引擎** 路线，不走原生 RichEditor。

理由：WYSIWYG 招牌价值在表格/嵌套列表/所见即所得的完整保真，原生 RichEditor 的 span 模型做不到块级结构编辑。方案 B 复用已验证的 WebView 栈（MdPreview 已跑通 onInterceptRequest + runJavaScript），能拿到完整能力。WYSIWYG 这块为混合架构——与 MdPreview 的 WebView 分界自洽。

现状：
- WYSIWYG 当前仅占位符（EditorPage.ets `Text('[ WYSIWYG 模式 — Phase 5 实现 ]')`）
- rawfile **只有 katex**，引擎 JS 未打包（context.md 已订正）
- MdPreview 已验证：onInterceptRequest + 自定义域名 `https://markdown.local` + rawfile 本地加载、runJavaScript 原地更新、registerJavaScriptProxy 可用（详见 obsidian 踩坑记录/WebView预览踩坑.md）

## 分批拆解（建议顺序）

### 批次 1：引擎选型 + 打包
- **待定决策**：打包完整 `@toast-ui/editor` dist（含 ww 模式，最省事、最保真）vs 自建最小 ProseMirror 构建（体积小但工作量大）。**建议：先用完整 @toast-ui/editor dist**，跑通后再考虑瘦身。
- 下载 @toast-ui/editor UMD bundle（toastui-editor-all.min.js + CSS）放 `rawfile/tui-editor/`
- 验证：能在 WebView 里加载并初始化一个空 WYSIWYG 编辑器

### 批次 2：WwEditor.ets WebView 容器组件
- 仿 MdPreview 结构：`new webview.WebviewController()`，加载本地 HTML（onInterceptRequest + `https://markdown.local`，**不用 data URI**——8KB 限制 + null origin）
- 本地 HTML 页面初始化 tui.editor ww 模式
- 与 MdPreview 不同：WYSIWYG **需要焦点**（MdPreview 用 `focusable(false)` 防抢焦点，WwEditor 反过来要能输入）
- 主题适配（暗/亮）

### 批次 3：ArkTS ↔ JS 桥
- **ArkTS → JS**（runJavaScript）：setMarkdown(content)、exec 工具栏命令（bold/italic/heading/list/quote/code/table/link/image...）、toggleTheme
- **JS → ArkTS**（registerJavaScriptProxy）：onChange（内容变更回传 markdown）、onSelectionChange（工具栏 active 态 + StatusBar 光标/字数）
- 桥对象在 aboutToAppear 注册，aboutToDisappear 注销

### 批次 4：Markdown 双向转换 + 模式切换同步
- tui.editor 自带 getMarkdown()/setMarkdown()，桥接到 EditorCore
- 切换 Markdown ↔ WYSIWYG 时内容互传：MdEditor 当前内容 → WwEditor，反之亦然
- EditorCore.state 内容保持单一真相源

### 批次 5：集成 EditorPage + Toolbar 联动
- EditorPage：`editorType === Wysiwyg` 时渲染 WwEditor 替换占位符
- Toolbar 命令在 WYSIWYG 模式下走 WebView 桥（而非 MdEditor 的 markdown 操作）
- StatusBar 接入 WYSIWYG 的 selection 事件

## 关键坑预案（开工前必读）

- **不用 data URI 加载** → 用 onInterceptRequest + 自定义域名 + rawfile（见 WebView预览踩坑.md：8KB 限制 + null origin 阻 font/CORS）
- **WwEditor 要焦点**：不要套 MdPreview 的 `focusable(false)`
- **WebView 输入法/光标**：HarmonyOS WebView 内 contenteditable 的 IME/光标行为需真机验证，可能有坑——批次 2 先验证基础输入
- **registerJavaScriptProxy 时机**：必须在 loadUrl 前注册，且 refresh() 后重注册
- ArkTS 严格模式 + UI 按钮规范见 CLAUDE.md

## Steps

- [ ] 批次 1: 引擎选型 + 打包到 rawfile/tui-editor/
- [ ] 批次 2: WwEditor.ets WebView 容器
- [ ] 批次 3: ArkTS↔JS 桥
- [ ] 批次 4: Markdown 双向转换 + 模式切换
- [ ] 批次 5: 集成 EditorPage + Toolbar 联动

## Checkpoint

**Status**: `planned` — 架构已定（方案 B），等新会话开工
**Assigned to**: 新会话（Hermes 拆批次 → CC 实现）
**Resume**: 新会话读本文件 + status.md。CC 读 CLAUDE.md + WebView预览踩坑.md。从批次 1 开始。
