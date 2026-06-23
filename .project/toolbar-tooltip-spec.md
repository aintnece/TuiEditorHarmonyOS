# Phase 5 — 工具栏 hover tooltip 规格（CC 执行）

> 只改 `entry/src/main/ets/components/Toolbar.ets`。给 17 个**图标按钮**加悬浮中文提示。文字标签按钮（编辑/分屏/预览/所见即所得/导出）不加。

## 为什么不用 bindPopup
项目已踩坑：bindPopup 在 32px 按钮上会让 onClick 需要双击（见 Obsidian bindPopup悬浮提示.md / CLAUDE.md）。**用 Stack + position 内联 tooltip + onHover**。

## 实现

### 1. 状态：把现有的 `@State saveHover: boolean` 删掉，改加：
```ts
@State hoveredTip: string = '';
```

### 2. 加一个 @Builder（放在 build() 之前或之后类内均可）：
```ts
@Builder
iconBtn(media: Resource, tip: string, action: () => void) {
  Stack({ alignContent: Alignment.TopStart }) {
    Button({ type: ButtonType.Normal }) {
      Image(media).width(16).height(16)
    }
    .width(32).height(32).padding(0)
    .backgroundColor(this.hoveredTip === tip ? this.themeColors.toolbarHover : Color.Transparent)
    .borderRadius(4)
    .onClick(action)
    .onHover((isHover: boolean): void => {
      if (isHover) {
        this.hoveredTip = tip;
      } else if (this.hoveredTip === tip) {
        this.hoveredTip = '';
      }
    })

    if (this.hoveredTip === tip) {
      Text(tip)
        .fontSize(11)
        .fontColor('#ffffff')
        .backgroundColor('#333333')
        .borderRadius(4)
        .padding({ left: 6, right: 6, top: 3, bottom: 3 })
        .position({ x: 0, y: 36 })   // 按钮(32)下方
        .zIndex(2)
    }
  }
  .margin({ left: 2, right: 2 })
}
```

### 3. 把 build() 里现有的 17 个图标 Button 整段，逐个替换成 `this.iconBtn(...)` 调用（保留原 onClick 逻辑、保留分隔符 Divider 和文字按钮、Blank 的原有位置顺序）：

| 替换为 | 图标 | 中文 tip | action（照搬原 onClick 体） |
|--------|------|---------|------|
| this.iconBtn | `$r('app.media.tui_bold')` | '加粗' | `() => { if (editorContext.editor) { editorContext.editor.exec('Bold'); } }` |
| this.iconBtn | `$r('app.media.tui_italic')` | '斜体' | `() => { if (editorContext.editor) { editorContext.editor.exec('Italic'); } }` |
| this.iconBtn | `$r('app.media.tui_strike')` | '删除线' | `() => { if (editorContext.editor) { editorContext.editor.exec('Strike'); } }` |
| this.iconBtn | `$r('app.media.tui_code')` | '行内代码' | `() => { if (editorContext.editor) { editorContext.editor.exec('Code'); } }` |
| this.iconBtn | `$r('app.media.tui_heading')` | '标题' | `() => { if (editorContext.editor) { editorContext.editor.exec('Heading', '2'); } }` |
| this.iconBtn | `$r('app.media.tui_quote')` | '引用' | `() => { if (editorContext.editor) { editorContext.editor.exec('Quote'); } }` |
| this.iconBtn | `$r('app.media.tui_bullet')` | '无序列表' | `() => { if (editorContext.editor) { editorContext.editor.exec('BulletList'); } }` |
| this.iconBtn | `$r('app.media.tui_ordered')` | '有序列表' | `() => { if (editorContext.editor) { editorContext.editor.exec('OrderedList'); } }` |
| this.iconBtn | `$r('app.media.tui_task')` | '任务列表' | `() => { if (editorContext.editor) { editorContext.editor.exec('TaskList'); } }` |
| this.iconBtn | `$r('app.media.tui_codeblock')` | '代码块' | `() => { if (editorContext.editor) { editorContext.editor.exec('Codeblock'); } }` |
| this.iconBtn | `$r('app.media.tui_link')` | '链接' | `() => { if (this.onLink) { this.onLink(); } else if (editorContext.editor) { editorContext.editor.exec('Link'); } }` |
| this.iconBtn | `$r('app.media.tui_image')` | '图片' | `() => { if (this.onImage) { this.onImage(); } else if (editorContext.editor) { editorContext.editor.exec('Image'); } }` |
| this.iconBtn | `$r('app.media.tui_table')` | '表格' | `() => { if (this.onTable) { this.onTable(); } else if (editorContext.editor) { editorContext.editor.exec('Table'); } }` |
| this.iconBtn | `$r('app.media.tui_hr')` | '分割线' | `() => { if (editorContext.editor) { editorContext.editor.exec('HorizontalRule'); } }` |
| this.iconBtn | `$r('app.media.tui_undo')` | '撤销' | `() => { if (editorContext.editor) { editorContext.editor.undo(); } }` |
| this.iconBtn | `$r('app.media.tui_redo')` | '重做' | `() => { if (editorContext.editor) { editorContext.editor.redo(); } }` |
| this.iconBtn | `$r('app.media.tui_save')` | '保存' | `() => { if (this.onSave) { this.onSave(); } }` |

注意：原来每个 Button 自带的 `.margin({ left: 2, right: 2 })` 现在由 iconBtn 内部统一带了，替换时去掉重复。保存按钮原来的 `.onHover`/saveHover 一并由 iconBtn 接管。

### 4. 防裁切（关键，否则 tooltip 在工具栏 44px 之外不显示）：
- 给 build() 最外层那个 Row 加 `.clip(false)`。
- 若真机发现 tooltip 仍被裁掉，再到 EditorPage.ets 包工具栏的 Column 上加 `.clip(false)`（先只改 Toolbar，真机看效果）。

## 坑预案
- ArkTS：@Builder 可带函数参数 `action: () => void`；onHover 回调里先判断再改 this.hoveredTip；图标参数类型用 `Resource`。
- tooltip 用 `position({x:0,y:36})` 在按钮下方；zIndex 抬高；Stack 用 `alignContent: Alignment.TopStart`。
- 文字标签按钮（编辑/分屏/预览/所见即所得/导出）和 Divider/Blank **不动**，顺序不变。

## 不要做
- ❌ 不用 bindPopup
- ❌ 不改命令逻辑（action 体照搬原 onClick）
- ❌ 不 commit/push，不动 .project
- 完成后列出改动文件，并贴出 iconBtn 这个 @Builder 的最终代码。
