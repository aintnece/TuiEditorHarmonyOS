# Phase 7 Batch A — 修复：主题切换无效 + 预览随主题重载

## 背景

Batch A 真机暴露两问题：
1. 代码块无高亮 —— 根因是 vendoring 的 prism.js 拼接坏了（minified 文件无分隔粘连）。**Hermes 已修复 rawfile/prism/prism.js（加 \n;\n 分隔，node 验证通过），本任务不涉及。**
2. **主题按钮点击无反应** —— EditorPage 双重切换抵消；且 MdPreview 不监听主题变化，预览（含 Prism 配色）不随主题切换。

本任务修这两个代码问题，改 **2 个文件**。

## 开工前必读
- `/data/docs/obsidian-vault/鸿蒙开发/踩坑记录/ArkTS严格模式规则.md`（const self=this、无正则）
- `/data/docs/obsidian-vault/鸿蒙开发/踩坑记录/WebView预览踩坑.md`

## 改动 1：`pages/EditorPage.ets` — 修主题按钮双重切换

主题切换按钮的 onClick（约 480-486 行）现在**切了两次**（抵消 → 无反应）：
```
.onClick(() => {
  ThemeService.getInstance().toggleTheme();          // 切第 1 次
  this.theme = ThemeService.getInstance().getTheme();
  if (editorContext.editor) {
    editorContext.editor.toggleTheme();              // → core → ThemeService.toggleTheme() 又切 1 次
  }
})
```
`editor.toggleTheme()` 内部已经：翻转 ThemeService + 重建 renderer + emit('stateChange')。所以**只能调它一个**。改成：
```
.onClick(() => {
  if (editorContext.editor) {
    editorContext.editor.toggleTheme();
  } else {
    ThemeService.getInstance().toggleTheme();
  }
  this.theme = ThemeService.getInstance().getTheme();
})
```
（删掉开头那行单独的 `ThemeService.getInstance().toggleTheme();`，改为 editor 为空时才直接切；最后刷新 this.theme。）

## 改动 2：`editor/markdown/MdPreview.ets` — 主题切换时整页重载

现状：MdPreview 只 `core.on('change')`，不听 `stateChange`，所以主题切换后预览不重建（页面底色 + Prism 主题 CSS 都不换）。

### 2a. 加字段
`private lastIsDark: boolean = false;`
`private stateChangeHandler: Handler = (): void => {};`

### 2b. aboutToAppear 里初始化 + 注册监听
在现有 `editorContext.core.on('change', this.changeHandler);` 之后加：
```
self.lastIsDark = editorContext.core.getTheme().isDark;
this.stateChangeHandler = (): void => {
  if (!editorContext.core) return;
  const dark: boolean = editorContext.core.getTheme().isDark;
  if (dark !== self.lastIsDark) {
    self.lastIsDark = dark;
    // 主题变了 → 强制整页重载（新底色 + 新 Prism/KaTeX 主题）
    self.bodyOnly = false;
    self.lastRendered = '';
    self.doRender();
  }
};
editorContext.core.on('stateChange', this.stateChangeHandler);
```

### 2c. aboutToDisappear 里注销
在现有 off('change', ...) 旁加：
`editorContext.core.off('stateChange', this.stateChangeHandler);`

### 2d. injectPrism 改用 core 的权威主题（关键时序修复）
当前 `injectPrism` 用 `this.themeColors.isDark` 选暗/亮 CSS。但主题切换时 `editor.toggleTheme()` **同步** emit stateChange，此刻 EditorPage 的 `this.theme` 尚未更新 → MdPreview 的 @Prop themeColors 仍是旧值。所以把 injectPrism 里：
```
this.themeColors.isDark
```
改为从 core 读权威值：
```
(editorContext.core ? editorContext.core.getTheme().isDark : this.themeColors.isDark)
```
（getFullHTML 已用 core 重建后的 renderer 出新底色，无需改。）

## 约束
- 只改 `pages/EditorPage.ets` 和 `editor/markdown/MdPreview.ets`，别动别的。
- ArkTS 严格：`const self = this` 已有；无正则；无 any/Record/索引；对象字面量仅 SDK 参数。
- 不要改 prism.js（Hermes 已修）、不要改 Renderer.ts、editor.html。

## 验收（CC 报告）
- EditorPage 主题 onClick 不再双切。
- MdPreview 加了 lastIsDark + stateChangeHandler（注册/注销）+ injectPrism 改读 core 主题。
- 仅这 2 文件改动。

## 真机验证（用户）
- 点主题按钮：整个界面（工具栏/编辑区/预览）暗↔亮切换；按钮文字「深色/浅色」对应翻转。
- Markdown 预览里的代码块**有 Prism 高亮**（prism.js 已修），且切主题时高亮配色（暗=tomorrow/亮=默认）跟随切换。
- 切换不崩、预览内容/滚动正常（整页重载会有一次刷新，正常）。
