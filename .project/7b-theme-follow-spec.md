# Phase 7 Batch B — WYSIWYG 主题跟随 + 移除诊断脚手架

## 状态

- ✅ 代码高亮已生效（token 配色 CSS 已加）；往返语言保留（rt 自测确认含 python）。
- ❌ **新问题**：WYSIWYG 模式下切暗/亮主题，WYSIWYG WebView 不跟随（停在亮色），代码配色也不变。
- 诊断脚手架使命完成，本轮一并移除。

改 **2 个文件**。

## 改动 1：`editor/markdown/WwEditor.ets` — 主题跟随（核心修复）

根因：WwEditor 只在 applyInitial（首次加载/切文件）调 `window.__ww.setTheme`，不监听主题切换。加 stateChange 监听，主题变化时实时调 setTheme（不重载、保内容/光标）。

### 1a. 顶部加 import
`import { Handler } from '../../event/EventEmitter';`

### 1b. 加字段（与现有 private 字段并列）
```
private lastIsDark: boolean = false;
private themeHandler: Handler = (): void => {};
```

### 1c. aboutToAppear 里注册监听
在现有 aboutToAppear 体内（设 pageUrl / onControllerReady 之后）加：
```
const self: WwEditor = this;
self.lastIsDark = editorContext.core ? editorContext.core.getTheme().isDark : this.themeColors.isDark;
this.themeHandler = (): void => {
  if (!editorContext.core || !self.isReady) return;
  const dark: boolean = editorContext.core.getTheme().isDark;
  if (dark === self.lastIsDark) return;
  self.lastIsDark = dark;
  self.controller.runJavaScript('window.__ww && window.__ww.setTheme(' + (dark ? 'true' : 'false') + ')');
};
if (editorContext.core) {
  editorContext.core.on('stateChange', this.themeHandler);
}
```

### 1d. aboutToDisappear 里注销
在现有 aboutToDisappear 体内加（与 setWwExec(null) 并列）：
```
if (editorContext.core) {
  editorContext.core.off('stateChange', this.themeHandler);
}
```

> 注：`window.__ww.setTheme(dark)` 已会切 tui 暗色 css + prism 暗色 css + body class（上一批已接好），所以这里只需触发它。

## 改动 2：`resources/rawfile/tui-editor/editor.html` — 移除诊断脚手架（保留真修复！）

**移除**（这些是临时诊断）：
- `<div id="diag" ...></div>` 元素
- IIFE 顶部的 `function diag(s){...}`、`window.onerror = ...`、`diag("page-js-start");` 三行
- `new EditorCtor` 成功后那组 `diag("plugin-ns...")` / `diag("csh...")` / `diag("plugins.len...")` / `diag("Prism...")` / `diag("init-ok")`
- 紧接其后的往返自测 try 块（`programmaticSet=true; ed.setMarkdown('```python...`; diag("rt:...`; ed.setMarkdown(""...); ... } catch(e){ diag("rt-ERR:...") ... }`）——**整块删掉**
- catch 块里的 `diag("init-ERR: ...")` 那一行（恢复为只有 `console.error('ww init failed', e); return;`）

**保留（不要删！这些是真修复）**：
- 插件 CSS `<link>`（toastui-editor-plugin-code-syntax-highlight.min.css）
- Prism 主题 `<link>`（prism-light.min.css / prism-tomorrow.min.css id=prism-dark-css）
- 插件 JS `<script>`（...plugin-code-syntax-highlight-all.min.js）
- plugins 数组 + `plugins: plugins`
- window.__ww.setTheme 里的 `prismDark.disabled = !dark` 切换
- 全部核心逻辑（window.__ww 桥、programmaticSet/lastSetMd 抑制、ed.on('change')→nativeBridge）

## 约束
- 只改这 2 文件。WwEditor 只加监听不动 applyInitial/桥；editor.html 只删诊断不碰真修复与核心逻辑。
- ArkTS 严格：const self=this、无正则、无 any/Record/索引。

## 验收（CC 报告）
- WwEditor.ets：加 Handler import + lastIsDark/themeHandler 字段 + aboutToAppear 注册 stateChange + aboutToDisappear 注销。
- editor.html：诊断全清（无 #diag、无 diag()/onerror/page-js-start、无状态转储、无往返自测、catch 复原）；插件 + Prism 主题 + setTheme prism 切换 + 核心逻辑全保留。
- 仅 2 文件。

## 用户真机
- WYSIWYG 模式下点主题按钮：整个 WYSIWYG（背景/文字/代码块）跟随暗↔亮切换，代码高亮配色对应切换。
- 屏幕顶部不再有绿色诊断条。
- 代码高亮、语言、Markdown↔WYSIWYG 切换仍正常。
