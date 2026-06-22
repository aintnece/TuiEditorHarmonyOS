# Active Task

## Objective

保存按钮 UI 重设计：从标题栏迁移到 Toolbar，采用 Feather SVG 图标风格

## Context

现保存按钮在 EditorPage 标题栏，使用 `Button() { Text('保存') }`，风格不统一。
CLAUDE.md 已新增「UI 按钮设计规范」，所有按钮必须遵循。

## Steps

1. **创建 SVG 图标** `resources/base/media/tui_save.svg`
   - Feather Icons 风格：16×16 viewBox，`stroke="currentColor"`，无 fill
   - 参考现有 `tui_undo.svg` / `tui_redo.svg` 的风格
   - 图标内容：磁盘保存图标

2. **修改 `Toolbar.ets`** — 在撤销/重做后面加保存按钮：
   ```
   ...Redo button...
   Divider
   Button({ type: ButtonType.Normal }) {
     Image($r('app.media.tui_save')).width(16).height(16)
   }
     .width(32).height(32).padding(0)
     .backgroundColor(saveHover ? themeColors.toolbarHover : Color.Transparent)
     .borderRadius(4)
     .onClick(onSave)
     .margin({ left: 2, right: 2 })
   ```
   - 添加 `@State saveHover: boolean` + `.onHover()`
   - 已有 `onExport` 回调，同理加 `onSave` 回调
   - 用 `Divider` 与撤销/重做分隔

3. **修改 `EditorPage.ets`** — 从标题栏移除保存按钮：
   - 删除标题栏的 `if (this.isDirty) { Button save... }`
   - 删除 `saveFile()` / `showToast()` 方法（移动端保留在标题栏？不——统一放 Toolbar）
   - 保留 `currentFilePath` / `isDirty` / `@State` 变量
   - 保留 `aboutToAppear()` 中的 fileService 初始化

4. **EditorPage 提供 onSave 回调给 Toolbar**：
   - `Toolbar({ onSave: () => { this.saveFile(); } })`
   - `saveFile()` 方法保留在 EditorPage

## Checkpoint

**Status**: `pending`
**Assigned to**: Claude Code
