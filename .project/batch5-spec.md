# Phase 5 批次 5.1 规格 — Toolbar 直接命令在 WYSIWYG 下路由到 window.__ww.exec

> CC 执行。改 2 个文件：Editor.ts、WwEditor.ets。Toolbar.ets **不改**。

## 背景

Toolbar 所有格式按钮都调 `editorContext.editor.exec('Bold'/'Italic'/...)`（ArkTS 命令名，走 MarkdownCommands 改 core.markdown 文本）。WYSIWYG 模式下内容在 WebView（ProseMirror），core 文本改了 WebView 不反映 → 工具栏在 WYSIWYG 下无效。

修复：在 `Editor.exec/undo/redo` 收口处路由——WYSIWYG 模式且 WwEditor 注册了 wwExec 回调时，把命令映射成 tui 命令名 + payload，调 `window.__ww.exec`；否则走原 core。避免循环依赖：用 Editor 自身的 wwExec 字段（由 WwEditor 通过 editorContext.editor 注册），**不要在 Editor.ts import editorContext**。

本批次只做**直接命令**：Bold/Italic/Strike/Code/Heading/Quote/BulletList/OrderedList/TaskList/Codeblock/HorizontalRule + undo/redo。Link/Image/Table（对话框、payload 复杂）留 5.2，不在本次。

## 文件 A：entry/src/main/ets/editor/Editor.ts

### 1. 在 imports 之后、`export class Editor` 之前，加类型与小类：

```ts
/** WYSIWYG exec 回调：由 WwEditor 注册，把命令转发到 WebView 的 window.__ww.exec */
type WwExecFn = (name: string, payloadJson: string) => void;

/** tui.editor 命令映射结果 */
class TuiCmd {
  cmd: string = '';
  payloadJson: string = '';
}
```

### 2. 类内加字段 + setter（放在 `private core: EditorCore;` 之后）：

```ts
private wwExec: WwExecFn | null = null;

/** WwEditor 注册/注销 WYSIWYG 命令转发回调 */
setWwExec(fn: WwExecFn | null): void {
  this.wwExec = fn;
}
```

### 3. 加私有映射方法（放在类内靠后即可）：

```ts
/** ArkTS 命令名 → tui.editor 命令名 + payload(JSON 字符串)。不支持的返回 null */
private mapToTui(name: string, args: string[]): TuiCmd | null {
  const c: TuiCmd = new TuiCmd();
  if (name === 'Bold') { c.cmd = 'bold'; return c; }
  if (name === 'Italic') { c.cmd = 'italic'; return c; }
  if (name === 'Strike') { c.cmd = 'strike'; return c; }
  if (name === 'Code') { c.cmd = 'code'; return c; }
  if (name === 'Heading') {
    const level: string = args.length > 0 ? args[0] : '2';
    c.cmd = 'heading';
    c.payloadJson = '{"level":' + level + '}';
    return c;
  }
  if (name === 'Quote') { c.cmd = 'blockQuote'; return c; }
  if (name === 'BulletList') { c.cmd = 'bulletList'; return c; }
  if (name === 'OrderedList') { c.cmd = 'orderedList'; return c; }
  if (name === 'TaskList') { c.cmd = 'taskList'; return c; }
  if (name === 'Codeblock') { c.cmd = 'codeBlock'; return c; }
  if (name === 'HorizontalRule') { c.cmd = 'hr'; return c; }
  return null;
}
```

### 4. 改 `exec` 方法为：

```ts
/** 执行命令 */
exec(name: string, ...args: string[]): boolean {
  // WYSIWYG 模式：路由到 WebView 引擎
  if (this.core.state.editorType === EditorType.Wysiwyg && this.wwExec) {
    const tui: TuiCmd | null = this.mapToTui(name, args);
    if (tui) {
      this.wwExec(tui.cmd, tui.payloadJson);
      return true;
    }
    return false; // WYSIWYG 下不支持的命令，忽略（不要落到 core 改文本）
  }
  const result = this.core.exec(name, ...args);
  return result !== null;
}
```

### 5. 改 `undo` / `redo`：

```ts
/** 撤销 */
undo(): boolean {
  if (this.core.state.editorType === EditorType.Wysiwyg && this.wwExec) {
    this.wwExec('undo', '');
    return true;
  }
  return this.core.undo();
}

/** 重做 */
redo(): boolean {
  if (this.core.state.editorType === EditorType.Wysiwyg && this.wwExec) {
    this.wwExec('redo', '');
    return true;
  }
  return this.core.redo();
}
```

（EditorType 已在 Editor.ts 顶部 import，无需新增 import。**不要** import editorContext。）

## 文件 B：entry/src/main/ets/editor/markdown/WwEditor.ets

在 `onPageEnd` 的 `applyInitial()` 之后，注册 wwExec；并加 `aboutToDisappear` 注销。

### 1. onPageEnd 里（isReady 块内，applyInitial 之后）加注册：

```ts
.onPageEnd((): void => {
  if (!this.isReady) {
    this.isReady = true;
    this.applyInitial();
    this.registerWwExec();
  }
})
```

### 2. 加私有方法 registerWwExec（箭头闭包捕获 this，调 controller.runJavaScript）：

```ts
private registerWwExec(): void {
  if (!editorContext.editor) return;
  editorContext.editor.setWwExec((name: string, payloadJson: string): void => {
    const n: string = encodeURIComponent(name);
    const p: string = encodeURIComponent(payloadJson);
    this.controller.runJavaScript(
      'window.__ww && window.__ww.exec(decodeURIComponent("' + n + '"), decodeURIComponent("' + p + '"))'
    );
  });
}
```

### 3. 加 aboutToDisappear（切回 Markdown 时注销，避免 Editor.exec 路由到已销毁的 WebView）：

```ts
aboutToDisappear(): void {
  if (editorContext.editor) {
    editorContext.editor.setWwExec(null);
  }
}
```

## 原理 / 数据流

- WYSIWYG 下点工具栏「粗体」→ Toolbar 调 `editor.exec('Bold')` → Editor.exec 检测 Wysiwyg+wwExec → mapToTui('Bold')→{cmd:'bold'} → wwExec('bold','') → runJavaScript `window.__ww.exec('bold','')` → `ed.exec('bold', undefined)` → tui.editor 加粗 → 触发 change（非程序化，programmaticSet=false）→ nativeBridge.onChange → core 同步 + 标脏。✓
- 标题：exec('Heading','2') → {cmd:'heading', payloadJson:'{"level":2}'} → ed.exec('heading',{level:2})。✓
- 撤销/重做：WYSIWYG 下走 ed.exec('undo'/'redo')（tui 自己的历史）。✓
- payloadJson 为空串时：JS 侧 `payloadJson ? JSON.parse : undefined` → undefined，安全。

## 坑预案

- **不要在 Editor.ts import editorContext**（循环依赖：EditorContext 已 import Editor）。用 Editor 自身 wwExec 字段 + setWwExec，由 WwEditor 经 editorContext.editor 注册。
- ArkTS：用 class TuiCmd（禁对象字面量）；type WwExecFn 函数类型别名可用；箭头闭包捕获 this 可用（参考 onInterceptRequest）。
- registerWwExec 在 onPageEnd（runJavaScript 此时可用）；aboutToDisappear 注销。

## 不要做

- ❌ 不改 Toolbar.ets（它继续调 editor.exec，路由在 Editor.exec 内完成）
- ❌ 不做 Link/Image/Table（对话框，留 5.2）
- ❌ 不 commit/push，不动 .project/
- 完成后列出改动文件。
