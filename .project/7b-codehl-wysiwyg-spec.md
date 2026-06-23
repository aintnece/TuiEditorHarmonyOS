# Phase 7 — 代码语法高亮 / Batch B：WYSIWYG（editor.html 注册 tui 插件）

## 目标

WYSIWYG 模式（WwEditor 的 tui.editor 引擎）里，代码块按语言高亮。**只改 1 个文件：`entry/src/main/resources/rawfile/tui-editor/editor.html`。**

## 已就绪（不用动）

- 插件资产已 vendoring 到 `rawfile/tui-editor/`：
  - `toastui-editor-plugin-code-syntax-highlight-all.min.js`（499KB，自带 Prism + 全语言，UMD 暴露 `toastui.Editor.plugin.codeSyntaxHighlight`，并设 `window.Prism.manual=true`）
  - `toastui-editor-plugin-code-syntax-highlight.min.css`
- **WwEditor.ets 不用改**：它的 onInterceptRequest 已把 `https://wweditor.local/<file>` 映射到 rawfile `tui-editor/<file>` 并按 .js/.css 设 MIME，新插件资产会被自动服务。

## 开工前必读

- `/data/docs/obsidian-vault/鸿蒙开发/踩坑记录/WebView预览踩坑.md`（editor.html 是 Phase 5 敏感区，改动要克制）
- 现有 `editor.html`（rawfile/tui-editor/editor.html）：保持 setMarkdown/change 抑制（programmaticSet+lastSetMd）、window.__ww 桥、onChange→nativeBridge 这些逻辑**一律不动**。

## 实现（editor.html 三处加，别动其它逻辑）

### 1. head 里加插件 CSS（放在现有 dark css `<link>` 之后）
```
<link rel="stylesheet" href="https://wweditor.local/toastui-editor-plugin-code-syntax-highlight.min.css">
```

### 2. 加载插件 JS（必须放在 editor-all 那个 `<script>` 之后）
现有：`<script src="https://wweditor.local/toastui-editor-all.min.js"></script>`
之后加一行：
```
<script src="https://wweditor.local/toastui-editor-plugin-code-syntax-highlight-all.min.js"></script>
```
（顺序关键：插件依赖 editor 全局，必须后加载。）

### 3. 注册插件到 Editor（IIFE 里、`new EditorCtor({...})` 之前/之中）
在现有 try 块里、构造编辑器前，安全取插件并构造 plugins 数组（**取不到就不加，避免 `plugins:[undefined]` 让构造抛错→白屏**）：
```
var plugins = [];
if (toastui.Editor.plugin && toastui.Editor.plugin.codeSyntaxHighlight) {
  plugins.push(toastui.Editor.plugin.codeSyntaxHighlight);
}
```
然后在 `new EditorCtor({...})` 的配置对象里加一项 `plugins: plugins,`（其它配置项 el/initialEditType/previewStyle/hideModeSwitch/height/initialValue/toolbarItems 原样保留）。

## 约束

- **只改 editor.html**，不改 WwEditor.ets、Editor.ts、任何 ArkTS、prism.js、MdPreview。
- 不动 editor.html 现有的：window.__ww（setMarkdown/getMarkdown/setTheme/focus/exec）、change 抑制（programmaticSet/lastSetMd）、ed.on('change') → nativeBridge.onChange 逻辑。
- 插件取不到时必须优雅降级（plugins 空数组），编辑器照常初始化，绝不能因插件白屏。

## 验收（CC 报告）

- editor.html：加了插件 CSS link、插件 JS script（在 editor-all 之后）、plugins 数组 + `plugins: plugins` 配置。
- 其它逻辑零改动。仅 editor.html 一个文件。

## 真机验证（用户）

- **WYSIWYG 模式**下，插入一个代码块并选语言（tui 代码块可选语言；或先 Markdown 写 ```python 代码块再切到 WYSIWYG），代码应有 Prism 高亮。
- 切换 Markdown↔WYSIWYG，两边代码块都高亮。
- ⚠️ 若 WYSIWYG **整页白屏** = 插件加载/注册出问题（多半是全局名或加载顺序）——立刻告诉我，我会在 editor.html 埋屏幕诊断一轮定位。
- 暗色模式下代码块配色若不协调（插件 CSS 单主题），属已知小问题，可后续单独调，不阻塞本批次。
