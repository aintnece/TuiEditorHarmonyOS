# Phase 7 — 代码语法高亮 / Batch A：MdPreview（Markdown 预览）

## 目标

Markdown 模式的预览（MdPreview WebView）里，fenced 代码块（```lang ... ```）按语言高亮着色。**仅改 `entry/src/main/ets/editor/markdown/MdPreview.ets` 一个文件。**

## 已就绪（不用动）

- 代码块 HTML 已是 Prism 期望格式：`<pre><code class="language-xxx">...</code></pre>`（HtmlRenderer.renderCodeBlock，**不要改 Renderer.ts**）。
- 资产已由 Hermes vendoring 到 rawfile：
  - `rawfile/prism/prism.js`（Prism 核心 + 14 语言：c/cpp/java/csharp/go/rust/python/json/yaml/bash/sql/markdown/typescript/jsx）
  - `rawfile/prism/prism-tomorrow.min.css`（暗色主题）、`rawfile/prism/prism-light.min.css`（亮色主题）

## 开工前必读

- `/data/docs/obsidian-vault/鸿蒙开发/踩坑记录/WebView预览踩坑.md`（loadUrl/拦截/CORS）
- `/data/docs/obsidian-vault/鸿蒙开发/踩坑记录/ArkTS严格模式规则.md`（**不用正则，用 split/join**）
- 本文件现有的 KaTeX 实现就是模板：`KATEX_PREFIX` 常量、onInterceptRequest 里的 KaTeX 分支、`injectKatex()`、doRender 的首次/更新两条路径。**Prism 完全镜像 KaTeX 的做法。**

## 实现（照搬 KaTeX 模式，4 处）

### 1. 加 PRISM_PREFIX 常量
在 `KATEX_PREFIX` 常量旁，定义一个**同 host/scheme** 的 Prism 前缀（把 katex 段换成 prismassets），例如若 KATEX_PREFIX 是 `https://markdown.local/katexassets/` 则 `const PRISM_PREFIX = 'https://markdown.local/prismassets/'`。**以实际 KATEX_PREFIX 的写法为准镜像，保证 host 一致。**

### 2. onInterceptRequest 加 Prism 分支
在 KaTeX 分支之后、参照它写一个 `if (url.startsWith(PRISM_PREFIX))` 分支：
- `const path = url.substring(PRISM_PREFIX.length);`
- `const rawPath = 'prism/' + path;`
- 其余（getRawFileContentSync(rawPath) → copy → setResponseData → ACAO header → setResponseIsReady）与 KaTeX 分支一字不差地照搬。
- MIME：`getMimeType` 已处理 .js/.css，无需改。

### 3. 加 injectPrism(html)（仿 injectKatex）
新增私有方法 `injectPrism(html: string): string`，用 split/join：
- 主题 CSS（按当前主题选）插在 `</head>` 前：
  - `const prismCss = '<link rel="stylesheet" href="' + PRISM_PREFIX + (this.themeColors.isDark ? 'prism-tomorrow.min.css' : 'prism-light.min.css') + '">';`
  - `result = result.split('</head>').join(prismCss + '\n</head>');`
- Prism JS 插在 `</body>` 前（拆 `</script>` 防解析，照 injectKatex 的写法）：
  - `const prismJs = '<script src="' + PRISM_PREFIX + 'prism.js"></' + 'script>';`
  - 初始化脚本（DOMContentLoaded 里高亮）：`'<script>document.addEventListener("DOMContentLoaded", function(){ if (typeof Prism !== "undefined") { Prism.highlightAll(); } });</' + 'script>'`
  - `result = result.split('</body>').join(prismJs + '\n' + prismInit + '\n</body>');`
- 返回 result。

### 4. doRender 两条路径都接上
- 首次加载路径（`!bodyOnly`，现有 `fullHtml = this.injectKatex(fullHtml);` 之后）加一行：`fullHtml = this.injectPrism(fullHtml);`
- 更新路径（runJavaScript 那段，现有 KaTeX `renderMathInElement(article,...)` 之后、同一段 JS 字符串里）追加：`'if (typeof Prism !== "undefined") { Prism.highlightAllUnder(article); }'`（在 `if (article){...}` 块内、KaTeX 之后）。

## 约束

- 只改 `MdPreview.ets`，不动 Renderer.ts / 其它文件。
- ArkTS 严格：不用正则（split/join）；字符串里的 `</script>` 必须拆成 `'</' + 'script>'`；对象字面量仅限 SDK 参数（同现有 setResponseHeader 写法）。

## 验收（CC 报告）

- 改动仅 MdPreview.ets：新增 PRISM_PREFIX、intercept Prism 分支、injectPrism()、doRender 两处接线。
- 不动 Renderer.ts、editor.html、其它文件。

## 真机验证（用户）

- Markdown 模式预览：写一段带语言的代码块，例如
  ```
  ```python
  def f(x):
      return x + 1
  ```
  ```
  预览里关键字/字符串/函数名应有 Prism 着色。
- 切暗/亮主题，代码高亮主题对应切换。
- 改代码块内容，预览实时更新且仍高亮（验证 update 路径的 highlightAllUnder）。
- 行内代码 `like this`、其它 Markdown 渲染、KaTeX 公式不受影响。
