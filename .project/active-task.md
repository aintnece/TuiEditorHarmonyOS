# Active Task

## Objective

实现 Phase 4.8：EditorPage 完整集成 — 文件系统 I/O

## Context

Phase 4.7 编译通过。SidePanel / StatusBar / ExportSheet 组件代码就绪，但文件操作为 stub：
- SidePanel 显示 mock 数据，不读真实文件
- 新建/打开文件回调为空
- ExportSheet 不写文件
- EditorPage 从硬编码内容启动

Phase 4.8 补齐这些，让编辑器具备真实文件能力。

## Components

### 1. FileService（文件服务）🆕

封装 HarmonyOS 文件 API（@ohos.file.fs），提供统一接口：
- `listFiles(dir: string)` → 获取目录下的 .md 文件列表
- `readFile(path: string)` → 读取文本内容
- `writeFile(path: string, content: string)` → 写入文本
- `createFile(dir: string, name: string)` → 新建空文件
- `deleteFile(path: string)` → 删除文件

### 2. SidePanel 接入真实文件

- 从 FileService 读取沙箱目录下的 .md 文件
- 点击文件名 → 通过 editorContext 更新内容
- 新建按钮 → 创建新文件
- 打开按钮 → 文件选择器（Phase 8 补充完整实现）
- 文件名显示真实路径

### 3. EditorPage 文件管理

- `currentFilePath: string` — 当前文件路径状态
- `saveFile()` — 保存当前内容到文件
- `openFile(path: string)` — 加载指定文件内容
- 标题栏显示当前文件名（取自路径）
- 工具栏增加保存按钮（或复用导出逻辑）
- 内容变更时标题栏显示 `•` 未保存标记

### 4. ExportSheet 文件写入

- `doExport()` 实际写入 HTML 文件到沙箱目录
- 导出成功后 toast 提示文件路径
- 文件名 = 当前文件名 + `_export.html`

## Steps

- [ ] Step 1: 创建 `services/FileService.ts` — 文件系统服务封装
- [ ] Step 2: 修改 `SidePanel.ets` — 接入 FileService，读取真实文件列表
- [ ] Step 3: 修改 `EditorPage.ets` — 添加文件管理状态（currentFilePath/save/open/未保存标记）
- [ ] Step 4: 修改 `ExportSheet` doExport — 实际写入 HTML 文件
- [ ] Step 5: CC 自测
- [ ] Step 6: Hermes 审查 + commit

## Files Changed (Planned)

1. **新建**: `entry/src/main/ets/services/FileService.ts` — 文件系统服务
2. **修改**: `entry/src/main/ets/components/SidePanel.ets` — 接入 FileService
3. **修改**: `entry/src/main/ets/pages/EditorPage.ets` — 文件管理状态 + 保存/打开方法
4. **修改**: `entry/src/main/ets/components/ExportSheet.ets` — 实际写文件

## Checkpoint

**Status**: `pending`
**Assigned to**: Claude Code
**Next step**: CC 创建 FileService + 修改 SidePanel/EditorPage/ExportSheet
