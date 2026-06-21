# Active Task

## Objective

Phase 4.6: ContextMenu — 右键上下文菜单组件

对标 tui.editor 的 context menu，在编辑区右键/长按时弹出。
包含：复制、剪切、粘贴、全选、撤销、重做等快捷操作。

## Context

- 参考文件：`entry/src/main/ets/pages/EditorPage.ets` — 集成入口
- 新建文件：`entry/src/main/ets/components/ContextMenu.ets` — 菜单组件
- 菜单项需对接 EditorCore 的方法和文本选区
- 显示条件：右键点击 MdEditor 区域（TextArea）
- ArkTS 约束：不能使用系统原生 ContextMenu（API 不兼容），用自定义 Stack+position 弹出层

## Progress

- [x] Step 1: 创建 ContextMenu 组件（Stack+position 浮层，6项菜单：复制/剪切/粘贴/全选/撤销/重做）
- [x] Step 2: 在 MdEditor 中绑定 LongPressGesture，通过 onLongPress 回调传递触摸坐标
- [x] Step 3: 在 EditorPage 中集成，管理 showContextMenu/contextMenuX/contextMenuY 状态
- [x] Step 4: 对接 EditorCore + pasteboard：复制/剪切/粘贴/全选/撤销/重做全部实现
- [x] Step 5: 代码完成（待 DevEco Studio 编译验证）

## Checkpoint

**Status**: `completed`
**Assigned to**: Claude Code
**Completed**: 2026-06-21 — ContextMenu component created, MdEditor gesture wired, EditorPage integrated with pasteboard support
**Next step**: Hermes 审查 diff → DevEco Studio 编译验证 → commit

---

## Bug Fix (2026-06-21): @Prop Type Mismatch Fix

**Root cause**: EditorPage declares `editor: Editor | null` and `core: EditorCore | null`, but child components declared @Prop types as non-null. In ArkTS strict mode, `Editor | null` cannot be assigned to `@Prop editor: Editor`. ArkTS silently uses the default value instead, causing Toolbar to operate on a DIFFERENT Editor instance.

**Files modified** (no commit):
- `entry/src/main/ets/components/Toolbar.ets` — @Prop editor → `Editor | null`, null guards on all 22 button handlers + aboutToAppear
- `entry/src/main/ets/editor/markdown/MdEditor.ets` — @Prop editorCore → `EditorCore | null`, null guards on aboutToAppear/Disappear, build callbacks, focus()
- `entry/src/main/ets/editor/markdown/MdPreview.ets` — @Prop editorCore → `EditorCore | null`, null guards on aboutToAppear/Disappear, doRender()
