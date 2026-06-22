# Active Task

## Objective

1. 修复：工具栏保存创建新文件后 SidePanel 不刷新
2. 清理：TuiSave 诊断日志（保存功能已真机验证通过）

## Bug: SidePanel 保存后不刷新

**现象**：点工具栏保存按钮 → 弹「已保存」、文件确实写入磁盘，但 SidePanel 列表不显示新建的 `未命名.md`。再点 SidePanel 新建按钮后，`未命名.md` 和 `新建文档.md` 才一起出现。

**根因**：SidePanel 文件列表是组件内 `@State fileList`，只在 `aboutToAppear()` 和 SidePanel 自己的新建按钮里调 `loadFiles()`。EditorPage 通过 `saveFile()` → `fileService.createFile()` 创建文件时，SidePanel 不知情，列表不刷新。

**修复（refresh token 模式）**：

1. **SidePanel.ets** 加刷新触发：
   ```typescript
   @Prop @Watch('onRefreshTokenChange') refreshToken: number = 0;

   private onRefreshTokenChange(): void {
     this.loadFiles();
   }
   ```
   注意：`loadFiles()` 当前会把 activeFilePath 重置为列表第一项，刷新后应保持 EditorPage 的当前文件高亮。可让 loadFiles 不覆盖已有 activeFilePath（若 activeFilePath 仍在新列表中则保留）。

2. **EditorPage.ets**：
   - 加 `@State sidePanelRefresh: number = 0;`
   - 传给 SidePanel：`SidePanel({ refreshToken: this.sidePanelRefresh, ... })`
   - `saveFile()` 中**当创建了新文件时**（currentFilePath 原本为空），`this.sidePanelRefresh++;` 触发刷新

## Cleanup: 移除 TuiSave 诊断日志

保存功能已真机验证（显示「已保存」、文件正常写入）。移除诊断日志：
- **FileService.ts**：移除所有 `hilog` 调用 + `import hilog` + `SAVE_DOMAIN`/`SAVE_TAG` 常量（共 18 处）。保留 `MAX_DEDUP` 循环保护和 try-catch。
- **EditorPage.ets**：移除所有 TuiSave 相关 `hilog` 调用 + import + 常量（共 11 处）。保留 saveFile 的 try-catch + showToast。
- **不要动 app.ets 的 hilog**（那是正常的应用级日志）。

## Steps

- [ ] Step 1: SidePanel.ets 加 refreshToken @Prop + @Watch
- [ ] Step 2: EditorPage.ets 加 sidePanelRefresh，saveFile 创建文件后自增
- [ ] Step 3: 清理 FileService.ts 的 TuiSave hilog
- [ ] Step 4: 清理 EditorPage.ets 的 TuiSave hilog
- [ ] Step 5: 报告改了哪些文件

## Checkpoint

**Status**: `pending`
**Assigned to**: Claude Code
