# Active Task

## Objective

修复 Phase 4.8 在真机上的两个 Bug

## Bug 1: 保存按钮不可见

`Button('💾')` — emoji 在 ArkTS Button 构造函数中不渲染。
按钮本身存在（可见 hover 阴影），但无可见文字。

**修复**: 用 `Button() { Text('保存') }` 或 TUI Feather 图标 SVG 替代 emoji。

## Bug 2: 点击保存按钮卡死

`saveFile()` 调用 `fileService` 的文件 API 导致程序卡死。

**可能原因**:
- `@ohos.file.fs` 的 `openSync` 文件打开模式标志位（十进制定义）可能与鸿蒙 API 不兼容
- 缺少文件权限声明
- `getContext(this).filesDir` 路径问题

**修复**:
1. 检查并修正 FileService.ts 中的文件打开模式常量
2. 在 module.json5 中确认文件读写权限
3. 添加 try-catch 防止未捕获异常导致卡死

## Steps

- [x] Step 1: 修改 EditorPage.ets — 保存按钮替换为 `Button() { Text('保存') }`，主题切换按钮同样修复
- [x] Step 2: 检查并修复 FileService.ts — `OPEN_MODE_TRUNC` 值从 128(0o200) 修正为使用 `fs.OpenMode` 枚举（实际值 512=0o1000）
- [x] Step 3: 检查 module.json5 — 应用沙箱目录读写无需额外权限，现有 READ_MEDIA/WRITE_MEDIA 保留
- [x] Step 4: 添加错误处理防止卡死 — saveFile() 添加 try-catch + Toast 提示，新增 showToast() 辅助方法

## Root Cause

**Bug 1**: `Button('💾')` / `Button('☀')` / `Button('🌙')` — ArkTS 的 `Button(label)` 构造函数不渲染 emoji 字符。

**Bug 2**: `FileService.ts` 中 `OPEN_MODE_TRUNC = 128` (0o200) 错误。
HarmonyOS 内核基于 Linux，O_TRUNC = 0o1000 = **512**，不是 128。
传入错误的标志位导致 `fs.openSync()` 行为不可预测，引发真机卡死。

## Changes

| 文件 | 变更 |
|------|------|
| `pages/EditorPage.ets` | 保存按钮: `Button() { Text('保存') }`；主题按钮: `Button() { Text('浅色'/'深色') }`；saveFile() 加 try-catch + Toast；新增 showToast()；doExport() 复用 showToast |
| `services/FileService.ts` | 移除硬编码十进制常量，改用 `fs.OpenMode.CREATE \| fs.OpenMode.WRITE_ONLY \| fs.OpenMode.TRUNC` |
| `module.json5` | ✗ 无需修改（沙箱 I/O 不需额外权限） |

## Checkpoint

**Status**: `done`
**Assigned to**: Claude Code
**Completed**: 2026-06-22
