# Active Task

## Objective

**Phase 5: WYSIWYG 模式** — 架构方案 B（WebView + ProseMirror/tui.editor 引擎）

> 本任务为大工程，分多批次交给 CC。本文件是新会话恢复入口。

## 架构决策（已拍板：方案 B）

WYSIWYG 走 **WebView + 真实 tui.editor 引擎（内含 ProseMirror）** 路线，不走原生 RichEditor。

理由：WYSIWYG 招牌价值在表格/嵌套列表/所见即所得的完整保真，原生 RichEditor 的 span 模型做不到块级结构编辑。方案 B 复用已验证的 WebView 栈（MdPreview 已跑通 onInterceptRequest + runJavaScript），能拿到完整能力。WYSIWYG 这块为混合架构——与 MdPreview 的 WebView 分界自洽。

现状：
- WYSIWYG 当前仅占位符（EditorPage.ets 603-612 行 `Text('[ WYSIWYG 模式 — Phase 5 实现 ]')`）
- MdPreview 已验证：onInterceptRequest + 自定义域名 `https://markdown.local` + rawfile 本地加载、runJavaScript 原地更新、registerJavaScriptProxy 可用（详见 obsidian 踩坑记录/WebView预览踩坑.md）

## 引擎打包（批次 1）✅ 已完成

引擎 dist 已 vendoring 到 `entry/src/main/resources/rawfile/tui-editor/`（直连 jsdelivr 下载，离线自包含）：

| 文件 | 大小 | 说明 |
|------|------|------|
| `toastui-editor-all.min.js` | 534KB | @toast-ui/editor v3.2.2 **全打包 UMD**（含 ProseMirror + DOMPurify，`<script>` 直接 `new toastui.Editor` 可用）。来源：`https://uicdn.toast.com/editor/3.2.2/`。UMD 全局：`window.toastui.Editor` |
| `toastui-editor.min.css` | 168KB | 主样式（浅色） |
| `toastui-editor-dark.css` | 17KB | 暗色主题样式 |

> ⚠️ 选 bundle 大坑（已踩，见 Obsidian WebView预览踩坑 十四）：npm 包 `@toast-ui/editor` dist 里的 `toastui-editor.min.js` 是 **bundler 专用**，externalize 了 prosemirror（浏览器 `<script>` 直接用 → `toastui.Editor is not a constructor`）。必须用官方 CDN `uicdn.toast.com` 的 **`-all` 全打包版**。npm dist **没有** `-all`。
> rawfile 经 `getRawFileContentSync` 读取**无 8KB 限制**（8KB 只限 data: URI / loadUrl），与 katex 同理。

## 分批拆解（建议顺序）

- [x] 批次 1: 引擎选型 + 打包到 rawfile/tui-editor/ ✅
- [x] 批次 2: WwEditor.ets WebView 容器 + rawfile/tui-editor/editor.html ✅ **真机验证通过**（init-ok，渲染+输入正常）
- [x] 批次 3: ArkTS↔JS 桥 ✅ **真机验证通过**（onChange 回写 core + exec + registerJavaScriptProxy；连带修复加载/切模式误标脏、内容串台）
- [x] 批次 4: 模式切换 + 文件切换两向同步 ✅ **真机验证通过**（applyInitial 读 core + onChange 写 core + loadToken 重灌机制覆盖）
- [x] 批次 5: 集成 EditorPage（占位符已替换 render）+ Toolbar 命令路由到 window.__ww.exec ✅ **真机验证通过**
  - [x] 5.1 直接命令（粗体/斜体/删除线/行内代码/标题/引用/三列表/代码块/分割线 + 撤销/重做）— Editor.exec 路由 + WwEditor 注册 wwExec。✅ **真机验证通过**
  - [x] 5.2 Link/Image/Table 在 WYSIWYG 下走 ww.exec — Editor.wysiwygExec + EditorPage 三处理器按模式分流（addLink/addImage/addTable + payload class JSON.stringify）。**待真机验证**

---

## 当前批次：批次 2 详细规格（CC 执行）

**目标**：做出一个独立可用的 WYSIWYG 编辑器组件，能在 WebView 里**渲染 tui.editor 的 ww 模式 + 接受键盘输入 + 主题适配**。本批次先做"加载 + 渲染 + 输入 + 主题 + 初始内容注入"，完整双向桥留批次 3。

### 交付文件（2 个新文件，禁止改其它文件）

#### 1. `entry/src/main/resources/rawfile/tui-editor/editor.html`（新建）

离线 HTML 页，初始化一个 WYSIWYG-only 的 tui.editor 实例。要求：

- **全部资源走自定义域名**（不引任何外网 CDN，完全离线）：
  - CSS：`<link rel="stylesheet" href="https://wweditor.local/toastui-editor.min.css">`
  - 暗色 CSS：`<link rel="stylesheet" href="https://wweditor.local/toastui-editor-dark.css">`（默认 disabled，按主题启用）
  - JS：`<script src="https://wweditor.local/toastui-editor.min.js"></script>`
- 一个铺满视口的 `#editor` 容器；`html,body { margin:0; height:100%; overflow:hidden }`；编辑器内部自己滚动。
- 初始化（UMD 全局 `toastui.Editor`）：
  ```js
  var ed = new toastui.Editor({
    el: document.getElementById('editor'),
    initialEditType: 'wysiwyg',
    previewStyle: 'vertical',
    hideModeSwitch: true,
    height: '100%',
    initialValue: ''
    // 不要 tui 自带 toolbar：toolbarItems: []  （原生 ArkTS Toolbar 驱动，批次 3 接）
  });
  ```
- **暴露全局桥 API（供批次 3 复用，本批次先实现这几个）**：
  ```js
  window.__ww = {
    setMarkdown: function(md){ ed.setMarkdown(md || '', false); },
    getMarkdown: function(){ return ed.getMarkdown(); },
    setTheme: function(dark){
      // 切换 dark CSS 的 disabled + body class
      var darkLink = document.getElementById('tui-dark-css');
      if (darkLink) darkLink.disabled = !dark;
      document.body.classList.toggle('toastui-editor-dark', !!dark);
    },
    focus: function(){ ed.focus(); }
  };
  ```
- 读 URL query `?theme=dark|light` 决定首屏是否启用暗色（在 init 后调 `window.__ww.setTheme(theme==='dark')`）。
- 给 dark `<link>` 一个 `id="tui-dark-css"` 以便 JS 切换。

#### 2. `entry/src/main/ets/editor/markdown/WwEditor.ets`（新建）

**严格照搬 MdPreview.ets 的 WebView/onInterceptRequest/rawfile/getMimeType 结构**（同目录，可直接参考），改动点如下：

- `@Component export struct WwEditor`，属性：`@Prop themeColors: ThemeColors;` `@Prop fontSize: number = 16;`，可选 `onControllerReady?: (ctrl: webview.WebviewController) => void;`
- 常量：`const WW_HOST: string = 'https://wweditor.local';`，页面 URL = `WW_HOST + '/editor.html?theme=' + (this.themeColors.isDark ? 'dark' : 'light')`
- `private controller: webview.WebviewController = new webview.WebviewController();` `private isReady: boolean = false;`
- `build()`：`Web({ src: <页面URL>, controller: this.controller })`
  - `.width('100%').height('100%')`
  - `.backgroundColor(this.themeColors.editorBg)`
  - `.javaScriptAccess(true).domStorageAccess(true)`
  - **`.focusable(true)`** ← 关键！**绝不能像 MdPreview 那样 `focusable(false)`**，WYSIWYG 要能输入
  - `.onInterceptRequest((event) => {...})`：所有 `url.startsWith(WW_HOST + '/')` 的请求 → 去掉 `WW_HOST + '/'` 前缀得到相对路径 → `getContext(this).resourceManager.getRawFileContentSync('tui-editor/' + rel)` → 按 MdPreview 同样的 `Uint8Array copy → resp.setResponseData(copy.buffer)`，set MIME（用 getMimeType 助手，需支持 .html→text/html / .js→application/javascript / .css→text/css / 字体）、`setResponseEncoding('utf-8')`、200、`setResponseHeader([{headerKey:'Access-Control-Allow-Origin', headerValue: WW_HOST}])`、`setResponseIsReady(true)`。取不到 rawfile（catch）→ `return null`。
  - `.onPageEnd(() => { if(!this.isReady){ this.isReady = true; this.applyInitial(); } })`
- `private applyInitial(): void`：从 `editorContext.core` 取初始 markdown（`editorContext.core ? editorContext.core.getMarkdown() : ''`），用 `encodeURIComponent` 转义后 `this.controller.runJavaScript('window.__ww && window.__ww.setMarkdown(decodeURIComponent("' + escaped + '"))')`；并 `runJavaScript('window.__ww && window.__ww.setTheme(' + this.themeColors.isDark + '))')`。
- `aboutToAppear()`：若 `onControllerReady` 存在则回调 controller（与 MdPreview 一致）。**本批次先不注册 registerJavaScriptProxy**（批次 3 做 onChange/selection 回传）。

### 关键坑预案（开工前必读，违反会返工）

1. **不用 data: URI / loadData** → 用 onInterceptRequest + `https://wweditor.local` + rawfile（见 WebView预览踩坑.md：8KB 限制 + null origin 阻 CORS）。页面用 `Web({ src })` 直接给自定义 URL，靠拦截器返回 HTML。
2. **WwEditor 必须 `focusable(true)`**，别套 MdPreview 的 `focusable(false)`。
3. **getRawFileContentSync 返回 Uint8Array**：必须 `new Uint8Array(len) + copy.set(data) + setResponseData(copy.buffer)`，照抄 MdPreview，别直接传原 buffer。
4. **ArkTS 严格模式**：禁对象字面量赋类型 / 禁 spread / 禁 any|unknown / 禁 Record / 禁 obj[key] / 回调里先 `const self = this` / import 全在顶部 / 正则 `\\` 不可靠改 split-join。setResponseHeader 的数组元素如报 untyped-obj-literal，照 MdPreview 既有写法（它已通过编译）。
5. **MIME**：`.js` 用 `'application/javascript'`，`.html` 用 `'text/html'`，`.css` 用 `'text/css'`。
6. **完全离线**：editor.html 不许出现任何 `https://cdn` / `https://unpkg` 等外网地址，全部 `https://wweditor.local/...`。
7. UMD 全局名是 `toastui.Editor`（若不确定可在容器里 `grep -o "toastui" toastui-editor.min.js | head`）。

### 不要做

- ❌ 不要改 `EditorPage.ets`（占位符替换是批次 5）
- ❌ 不要改 `Toolbar.ets`（命令联动是批次 3/5）
- ❌ 不要 `git commit` / `git push`（留给 Hermes）
- ❌ 不要动 `.project/`（进度文档由 Hermes 维护）

### 完成后

报告改动的文件清单（应为 2 个新文件）。若遇到新的鸿蒙坑，解决后补录到 `obsidian-vault/鸿蒙开发/踩坑记录/WebView预览踩坑.md`。

## Checkpoint

**Status**: ✅ **Phase 5 (WYSIWYG) 全部完成并真机验证通过**（批次 1-5：引擎/容器/输入/双向桥/模式·文件同步/工具栏全套命令/tooltip）。下一个需求：图片插入支持系统图库/文件选择（方案待确认，见 status.md Next）。
**批次 2 完成记录**: CC 实现 `WwEditor.ets` + `editor.html`；Hermes 审出并修复 1 个 bug（onInterceptRequest 未剥 query string → 首页 `editor.html?theme=dark` 落不到 rawfile，会白屏；已用 indexOf/substring 剥 `?`/`#` 修复）。**待真机验证：WebView 内 contenteditable 的输入法/光标行为**（最大设备风险，未编译验证）。
**Assigned to**: 批次 3 → CC（实现）→ Hermes（审 diff + 提交）
**Resume**: 新会话读本文件 + status.md。CC 读 CLAUDE.md + 本文件 + MdPreview.ets + WwEditor.ets + WebView预览踩坑.md。批次 3 在 WwEditor.ets 上加 registerJavaScriptProxy（onChange 回传 markdown + selection）+ ArkTS 公开方法（setMarkdown/exec 命令/setTheme 经 runJavaScript），并扩展 editor.html 的 `window.__ww`（exec 工具栏命令 + onChange/onSelection 回调桥）。
