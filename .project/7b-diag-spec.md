# Phase 7 Batch B — 诊断：WYSIWYG 代码高亮未生效

## 背景

Batch B 真机：WYSIWYG 代码块不高亮，语言显示 text，且 Markdown↔WYSIWYG 往返把 ```python 退化成 ```（语言丢失/源损坏）。插件 bundle 经 node 验证完好（SYNTAX OK）。需在 editor.html 埋**屏幕诊断条**，一轮真机定位是「插件没加载/没注册」还是「加载了但语言转换没生效」。

## 任务：只在 `entry/src/main/resources/rawfile/tui-editor/editor.html` 加诊断脚手架（纯附加，别动任何现有逻辑）

### 1. body 里加诊断条元素
在 `<div id="editor"></div>` 之后加：
```
<div id="diag" style="position:fixed;top:0;left:0;right:0;z-index:99999;font:11px monospace;background:rgba(0,0,0,.85);color:#0f0;padding:3px;white-space:pre-wrap;max-height:45%;overflow:auto;pointer-events:none"></div>
```

### 2. IIFE 最开头（`(function () {` 之后第一行）加诊断辅助 + 全局错误捕获
```
function diag(s){ var d=document.getElementById('diag'); if(d){ d.textContent += s + "\n"; } }
window.onerror = function(m, src, l){ diag("JS-ERR: " + m + " @" + (src||"") + ":" + (l||"")); };
diag("page-js-start");
```

### 3. 在编辑器 init 的 try 块里、`new EditorCtor({...})` **成功之后**，加状态转储
（即 `var ed = new EditorCtor({...});` 这一行之后、try 块结束前）：
```
diag("plugin-ns: " + (typeof toastui.Editor.plugin));
diag("csh: " + (typeof (toastui.Editor.plugin && toastui.Editor.plugin.codeSyntaxHighlight)));
diag("plugins.len: " + plugins.length);
diag("Prism: " + (typeof window.Prism) + " py=" + ((window.Prism && window.Prism.languages && window.Prism.languages.python) ? "Y" : "N"));
diag("init-ok");
```

### 4. catch 块里报错
现有 `catch (e) { console.error('ww init failed', e); return; }` 改为同时写诊断（保留 console.error 和 return）：
```
catch (e) {
  console.error('ww init failed', e);
  diag("init-ERR: " + (e && e.message ? e.message : e));
  return;
}
```

## 约束
- **只加诊断，不改**：window.__ww 桥、programmaticSet/lastSetMd 抑制、ed.on('change')、插件 CSS/JS 标签、plugins 数组逻辑、new EditorCtor 配置。
- 不改任何其它文件。
- 诊断条 `pointer-events:none` 不挡操作。

## 验收
- 仅 editor.html，附加诊断条 + diag()/onerror + init 后状态转储 + catch 报错。现有逻辑零改动。

## 用户真机（读诊断条念给我）
切到 WYSIWYG，看屏幕顶部绿字诊断条，把每行念出来。判读：
- 只有 `page-js-start`、没有后续 → 引擎或插件脚本没加载（资源拦截问题）。
- 有 `init-ERR:...` → 引擎/插件构造报错（念出错误信息）。
- `csh: undefined` → 插件全局没暴露（插件 JS 没加载或全局名不对）。
- `csh: function` + `plugins.len: 1` + `Prism: object py=Y` + `init-ok` → 插件已正确注册且 Prism 就绪 → 问题在语言转换/运行时（下一步深查 tui 代码块语言传递）。
- 任何 `JS-ERR:` 行 → 念出来。
