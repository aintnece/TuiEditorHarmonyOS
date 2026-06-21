# Active Task

## Objective

Phase 4.5 后 Bug 修复 — 4 个审查发现的问题，按严重程度排序。

## Context

代码审查发现 4 个 bug，需在进入 Phase 4.6 前修复。
参考文件：
- `entry/src/main/ets/editor/commands/commands/MarkdownCommands.ts` — Undo 修复
- `entry/src/main/ets/components/Toolbar.ets` — bindPopup 替换
- `entry/src/main/ets/editor/markdown/MdEditor.ets` — 事件清理
- `entry/src/main/ets/editor/markdown/MdPreview.ets` — 事件清理
- `entry/src/main/ets/pages/EditorPage.ets` — 表格操作实现

修复方案参考 Obsidian vault: `/data/docs/obsidian-vault/鸿蒙开发/`

## Progress

- [ ] Fix 1: Undo 破坏性 bug（严重）— MarkdownCommands.ts 所有 undo()
- [ ] Fix 2: bindPopup 改 Stack+position — Toolbar.ets 22个按钮
- [ ] Fix 3: 事件监听泄漏 — MdEditor.ets + MdPreview.ets 加 aboutToDisappear
- [ ] Fix 4: 表格操作空实现 — EditorPage.ets handleTableAction 补全

## Checkpoint

**Status**: `in_progress`
**Assigned to**: Claude Code
**Next step**: CC 执行修复 → Hermes 审查 diff → commit
