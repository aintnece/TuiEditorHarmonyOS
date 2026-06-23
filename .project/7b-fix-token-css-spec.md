# Phase 7 Batch B — 修复 token 配色 + 往返语言自测

## 诊断结论（已确认）

- 插件链路全通（plugin-ns object / csh function / plugins.len 1 / Prism py=Y / init-ok）——插件已正确注册、Prism 就绪。
- **根因①（无颜色）**：插件 CSS 不含 `.token` 配色（仅管编辑器 UI），WYSIWYG 缺 Prism 主题 CSS → token 无色。
- Hermes 已把 `prism-tomorrow.min.css`（暗）/ `prism-light.min.css`（亮）复制进 `rawfile/tui-editor/`，WwEditor 拦截器可经 `https://wweditor.local/<file>` 服务。
- **疑点②（语言显示 text / 往返丢语言）**：加一个自测确认是真丢还是无色错觉。

## 任务：只改 `entry/src/main/resources/rawfile/tui-editor/editor.html`

### 1. head 加 Prism 主题 CSS（放在插件 CSS link 之后）
```
<link rel="stylesheet" href="https://wweditor.local/prism-light.min.css" id="prism-light-css">
<link rel="stylesheet" href="https://wweditor.local/prism-tomorrow.min.css" id="prism-dark-css" disabled>
```
（亮色常开作基；暗色带 id、默认 disabled，启用时因在后面而覆盖亮色。）

### 2. window.__ww.setTheme 里同步切 Prism 暗色
在现有 `setTheme: function(dark){ ... }` 内，处理 tui dark css 的逻辑旁，加：
```
var prismDark = document.getElementById('prism-dark-css');
if (prismDark) { prismDark.disabled = !dark; }
```
（dark 时启用 prism 暗色主题，亮色时禁用 → 回落 prism 亮色。其它 setTheme 逻辑保留。）

### 3. 往返语言自测诊断（在 init 的 `diag("init-ok");` 之后加）
**必须用 programmaticSet 包住**，避免 ed.setMarkdown 触发 change → nativeBridge.onChange 回写污染 core：
```
try {
  programmaticSet = true;
  ed.setMarkdown('```python\nx = 1\n```', false);
  var rt = ed.getMarkdown();
  diag("rt: " + rt.split("\n").join("\\n").slice(0, 60));
  ed.setMarkdown("", false);
  lastSetMd = ed.getMarkdown();
  programmaticSet = false;
} catch (e) { diag("rt-ERR: " + (e && e.message ? e.message : e)); programmaticSet = false; }
```
（此自测在 init 时跑、此刻文档为空；onPageEnd 的 applyInitial 随后会用真实内容覆盖，不影响用户内容。）

## 约束
- 只改 editor.html。不动：window.__ww 的 setMarkdown/getMarkdown/focus/exec、programmaticSet/lastSetMd 主逻辑、ed.on('change')→nativeBridge、插件 CSS/JS 标签、plugins 数组、EditorCtor 配置、现有 #diag/diag()/onerror/状态转储。
- 不改其它文件、不改 prism.js、不改 WwEditor.ets。

## 验收
- editor.html：加 2 个 prism 主题 link、setTheme 切 prism 暗色、init-ok 后的往返自测。其它零改动。

## 用户真机（念诊断条 + 看效果）
1. 切到 WYSIWYG，念出诊断条新增的 `rt: ...` 行（这是 ```python 往返后的结果）：
   - `rt: ```python\nx = 1\n``` ` → **语言保留**，那之前"text"是无色错觉，本次应已高亮。
   - `rt: ```\nx = 1\n``` `（无 python）→ **真丢语言**，需再查 tui 转换。
2. 看 WYSIWYG 里的 ```python 代码块现在**是否有颜色高亮**（token 配色已加）。
3. 切暗/亮主题，代码块配色跟随。
