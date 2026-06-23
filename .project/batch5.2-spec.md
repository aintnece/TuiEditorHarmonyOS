# Phase 5 批次 5.2 规格 — Link/Image/Table 在 WYSIWYG 下走 ww.exec

> CC 执行。改 2 个文件：Editor.ts、EditorPage.ets。

## 背景
- Toolbar 的链接/图片/表格按钮走 EditorPage 的回调（onLink/onImage/onTable）开对话框/菜单。
- 现状（Markdown 模式正确）：confirmLink/confirmImage 拼 markdown snippet 插到 core（`core.onContentChange`）；onTable 开 markdown 表格操作菜单。
- WYSIWYG 模式下这些 markdown 文本插入不反映到 WebView。需分流到 tui.editor 命令（payload 字段名已从 bundle 核实）：
  - addLink: `{ linkText, linkUrl }`
  - addImage: `{ altText, imageUrl }`
  - addTable: `{ rowCount, columnCount }`

## 文件 A：entry/src/main/ets/editor/Editor.ts

加一个**公开**方法（wwExec 字段批次 5.1 已有）：
```ts
/** WYSIWYG 下执行带 payload 的命令（payloadJson 为 JSON 字符串）。已注册 wwExec 才生效 */
wysiwygExec(name: string, payloadJson: string): boolean {
  if (this.wwExec) {
    this.wwExec(name, payloadJson);
    return true;
  }
  return false;
}
```

## 文件 B：entry/src/main/ets/pages/EditorPage.ets

### 1. 顶部加 3 个 payload 小类（放在 NavData class 旁边，top-level）：
```ts
class LinkPayload { linkText: string = ''; linkUrl: string = ''; }
class ImagePayload { altText: string = ''; imageUrl: string = ''; }
class TablePayload { rowCount: number = 3; columnCount: number = 3; }
```

### 2. confirmLink 改为按模式分流：
```ts
private confirmLink = (text: string, url: string): void => {
  this.showLinkEditor = false;
  if (!editorContext.core) return;
  if (editorContext.core.state.editorType === EditorType.Wysiwyg) {
    if (editorContext.editor) {
      const p: LinkPayload = new LinkPayload();
      p.linkText = text;
      p.linkUrl = url;
      editorContext.editor.wysiwygExec('addLink', JSON.stringify(p));
    }
    return;
  }
  const md: string = editorContext.core.getMarkdown();
  const pos: number = editorContext.core.state.selectionStart;
  const snippet: string = '[' + text + '](' + url + ')';
  const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
  editorContext.core.onContentChange(newMd);
};
```

### 3. confirmImage 同理：
```ts
private confirmImage = (alt: string, url: string): void => {
  this.showImageEditor = false;
  if (!editorContext.core) return;
  if (editorContext.core.state.editorType === EditorType.Wysiwyg) {
    if (editorContext.editor) {
      const p: ImagePayload = new ImagePayload();
      p.altText = alt;
      p.imageUrl = url;
      editorContext.editor.wysiwygExec('addImage', JSON.stringify(p));
    }
    return;
  }
  const md: string = editorContext.core.getMarkdown();
  const pos: number = editorContext.core.state.selectionStart;
  const snippet: string = '![' + alt + '](' + url + ')';
  const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
  editorContext.core.onContentChange(newMd);
};
```

### 4. onTable 回调（Toolbar 实例化处，约 544 行 `onTable: () => { this.showTableMenu = !this.showTableMenu; }`）改为：
```ts
onTable: () => {
  if (editorContext.core && editorContext.core.state.editorType === EditorType.Wysiwyg) {
    if (editorContext.editor) {
      const p: TablePayload = new TablePayload();
      // 默认 3x3，tui.editor 插入后可用其自带表内菜单增删行列
      editorContext.editor.wysiwygExec('addTable', JSON.stringify(p));
    }
    return;
  }
  this.showTableMenu = !this.showTableMenu;
}
```
（WYSIWYG 下表格按钮直接插入默认 3×3 表格；Markdown 模式保持原操作菜单。handleTableAction 那套 markdown 操作逻辑**不动**，它只在 Markdown 模式用。）

## 原理 / 数据流
- WYSIWYG 链接：对话框确认 → confirmLink 判定 Wysiwyg → LinkPayload + JSON.stringify（安全转义引号/特殊字符）→ editor.wysiwygExec('addLink', json) → window.__ww.exec('addLink', json) → JSON.parse → ed.exec('addLink', {linkText, linkUrl}) → tui.editor 插入链接 → change → 回写 core。✓
- 图片/表格同理。
- JSON.stringify 作用于 class 实例，序列化其字段为 `{"linkText":"...","linkUrl":"..."}`。

## 坑预案
- ArkTS：payload 用 class（禁对象字面量）；`JSON.stringify(实例)` ArkTS 支持，安全转义用户输入。
- EditorType 已在 EditorPage import（无需新增）。
- wysiwygExec 返回 false（wwExec 未注册）时静默——WYSIWYG 模式 WwEditor 必已挂载，wwExec 已注册，正常不会发生。

## 不要做
- ❌ 不改 Toolbar.ets / WwEditor.ets / editor.html（exec 原语已就位）
- ❌ 不动 handleTableAction（Markdown 表格操作逻辑保留）
- ❌ 不 commit/push，不动 .project
- 完成后列出改动文件。
