# Phase 5 批次 3 规格 — ArkTS↔JS 双向桥

> CC 执行。先读 CLAUDE.md（ArkTS 严格模式）、WwEditor.ets、editor.html、EditorCore.ts 的 onContentChange。

## 目标

建立 WwEditor 的双向桥。本批次重点 = **WYSIWYG 编辑实时写回 core**（JS→ArkTS），使切回 Markdown 模式能看到 WYSIWYG 的改动；并加 JS 侧 `exec` 原语（供批次 5 工具栏命令）。selection/StatusBar 接入留后续批次。

同时：**清理诊断脚手架**（#diag 条等），但保留健壮取构造器逻辑。

## 改动文件（只这 2 个）

### A. `entry/src/main/resources/rawfile/tui-editor/editor.html`

1. **删诊断脚手架**：移除 `<div id="diag">`、`diag()` 函数、`window.onerror→diag`、init 后那段 `setTimeout(...)` 度量。保留 `try/catch`（catch 里改成 `console.error('ww init failed', e)`，不再 diag）。保留 `EditorCtor` 健壮取法、`window.__ww`、`?theme`、`page-js-start` 那行也删。

2. **加"程序化设值抑制"标志**（否则 setMarkdown 触发的 change 会回传 → 加载即 dirty + 回声）：
   - 在 IIFE 顶部：`var suppressChange = false;`
   - `setMarkdown` 改为：
     ```js
     setMarkdown: function (md) {
       suppressChange = true;
       ed.setMarkdown(md || '', false);
       suppressChange = false;
     }
     ```

3. **监听 tui.editor change 事件 → 调原生代理**（代理存在才调，且受 suppress 控制）：
   ```js
   ed.on('change', function () {
     if (suppressChange) return;
     if (window.nativeBridge && window.nativeBridge.onChange) {
       try { window.nativeBridge.onChange(ed.getMarkdown()); } catch (e) {}
     }
   });
   ```

4. **window.__ww 加 exec**（供批次 5 工具栏，本批次先放着不调）：
   ```js
   exec: function (name, payloadJson) {
     var p;
     try { p = payloadJson ? JSON.parse(payloadJson) : undefined; } catch (e) { p = undefined; }
     ed.exec(name, p);
   }
   ```

### B. `entry/src/main/ets/editor/markdown/WwEditor.ets`

1. **桥类**（ArkTS：用 class，禁对象字面量）：
   ```ts
   class WwBridge {
     onChange(md: string): void {
       if (editorContext.core) {
         editorContext.core.onContentChange(md);
       }
     }
   }
   ```
   （`EditorCore.onContentChange(text)` 已存在：写 `state.markdown` + `isDirty=true` + `emit('change')`。）

2. **持有实例**：`private bridge: WwBridge = new WwBridge();`

3. **注册代理 —— 用 `.onControllerAttached` 时机**（controller 此时已绑定、页面加载前；**不要在 aboutToAppear 注册**，那时 controller 未绑定会抛错）：
   ```ts
   .onControllerAttached(() => {
     this.controller.registerJavaScriptProxy(this.bridge, 'nativeBridge', ['onChange']);
   })
   ```
   注：注册后页面加载时 `nativeBridge` 即注入到 JS 全局。若真机实测未注入，则在注册后补一句 `this.controller.refresh();`（先不加，实测需要再说）。

4. **绝不**新增对 core `'change'` 的监听去回灌编辑器（会与 onChange 形成回声死循环）。core→编辑器 只在 `applyInitial`(onPageEnd) 与批次 4 的模式切换时单向 `setMarkdown`。

## 坑预案

- **registerJavaScriptProxy 时机**：`onControllerAttached`（非 aboutToAppear）。
- **回声循环**：`setMarkdown` 用 `suppressChange` 抑制；WwEditor 不监听 core `'change'`。
- **加载即 dirty**：靠 suppressChange 解决（applyInitial 的 setMarkdown 不触发回传）。
- **ArkTS 严格**：桥用 class；箭头函数里用 `this` 是 OK 的（参考现有 onInterceptRequest 写法）；registerJavaScriptProxy 第三参是方法名字符串数组 `['onChange']`。

## 真机验证点（CC 不编译，Hermes 审 + 用户测）

- WYSIWYG 打字 → 切 Markdown 模式 → 应看到刚才输入的内容。
- 刚打开文件/刚切到 WYSIWYG 时，不应立即变 dirty（标题无修改标记）。

## 不要做

- ❌ 不动 `EditorPage.ets` / `Toolbar.ets`（exec 的 ArkTS 调用方 = 批次 5）
- ❌ 不 `git commit/push`，不动 `.project/`
- 完成后报告改动文件清单。
