# Phase 5 批次 3 — 修两个 bug（CC 执行）

> 真机测出。改 3 个文件：EditorCore.ts、EditorPage.ets、WwEditor.ets。先读这 3 个文件相关段落。

## Bug A：打开/切换文件就被标"已修改"（圆点 •）

**根因：** `EditorCore.setMarkdown()`（被 SidePanel 加载文件时调用）里 `state.isDirty=true` + emit('change')；EditorPage 的 change 监听又无条件 `this.isDirty=true`。加载文件 ≠ 用户修改，不该标脏。

**修复（2 处）：**

1. `entry/src/main/ets/editor/EditorCore.ts` 的 `setMarkdown(md)`：把 `this.state.isDirty = true;` 改成 `this.state.isDirty = false;`（加载内容是干净状态）。保留 `emit('change')`。
   （区别：`onContentChange()` 才是用户编辑，保持 `isDirty = true` 不动。）

2. `entry/src/main/ets/pages/EditorPage.ets` 的 change 监听（约 373-380 行，`editorContext.editor.on('change', ...)` 里）：
   把 `this.isDirty = true;` 改成 `this.isDirty = editorContext.core.state.isDirty;`
   （脏标志以 core.state 为准：加载→false，编辑→true。其余 this.content / canUndo / canRedo 不动。）

## Bug B：WYSIWYG 模式下切文件，内容还是上一份（要切回 Markdown 再切回来才对）

**根因：** WYSIWYG 模式下切文件时 WwEditor 组件不重建（if/else 只按 editorType 分支），`applyInitial`（onPageEnd 里、只跑一次）不再执行，所以 WebView 还显示旧内容。

**修复：用 @Prop @Watch 的 loadToken 触发重灌。**

1. `entry/src/main/ets/editor/markdown/WwEditor.ets`：
   - 加属性：`@Prop @Watch('onLoadTokenChange') loadToken: number = 0;`
   - 加方法：
     ```ts
     onLoadTokenChange(): void {
       if (this.isReady) {
         this.applyInitial();
       }
     }
     ```
   - `applyInitial()` 去掉 `if (initialMd.length > 0)` 守卫，**总是**注入（空字符串也注入，这样切到空文件能清空 WYSIWYG）：
     ```ts
     private applyInitial(): void {
       const core = editorContext.core;
       const initialMd: string = core ? core.getMarkdown() : '';
       const escaped: string = encodeURIComponent(initialMd);
       this.controller.runJavaScript(
         'window.__ww && window.__ww.setMarkdown(decodeURIComponent("' + escaped + '"))'
       );
       const isDarkStr: string = this.themeColors.isDark ? 'true' : 'false';
       this.controller.runJavaScript(
         'window.__ww && window.__ww.setTheme(' + isDarkStr + ')'
       );
     }
     ```
     （setMarkdown 在 JS 侧受 suppressChange 保护，重灌不会触发 onChange、不会误标脏。）

2. `entry/src/main/ets/pages/EditorPage.ets`：
   - 加状态：在其它 @State 旁加 `@State wwLoadToken: number = 0;`
   - 在 `onFileSelect` 回调里（约 513-518）末尾加：`this.wwLoadToken++;`
   - 在 `onNewFile` 回调里（约 519-524）末尾加：`this.wwLoadToken++;`
   - WwEditor 实例化处（约 604 行，WYSIWYG 分支）加传参：
     ```ts
     WwEditor({
       themeColors: this.theme,
       fontSize: 16,
       loadToken: this.wwLoadToken
     })
     ```

## 坑预案 / 注意

- ArkTS 严格模式：@Prop @Watch 写法 `@Prop @Watch('onLoadTokenChange') loadToken: number = 0;`，@Watch 参数是方法名字符串。
- 不要让 WwEditor 监听 core 'change'（会和用户编辑回声循环）——用 loadToken @Watch 这条单向通道。
- 时机：SidePanel 先 `core.setMarkdown(content)` 再 `onFileSelect(path)`，所以 EditorPage 自增 token 时 core 已是新内容，applyInitial 读到的是新文件。
- 真机验证点：①打开/切文件标题不出现圆点 ②WYSIWYG 下切文件内容立刻更新 ③WYSIWYG 打字后圆点出现（脏标志仍正确）。

## 不要做

- ❌ 不动 Toolbar.ets / editor.html（本次不需要）
- ❌ 不 commit/push，不动 .project/
- 完成后列出改动文件清单。
