# Active Task

## Objective

修复保存按钮：1) 图标用错（书签→磁盘）；2) 点击卡死

## Bug 1: 图标错误

`tui_save.svg` 当前是 Feather「书签 bookmark」图标（看起来像 banner）。
应改为 Feather「save 磁盘」图标。正确 path：
```
<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
<polyline points="17 21 17 13 7 13 7 21"></polyline>
<polyline points="7 3 7 8 15 8"></polyline>
```

## Bug 2: 点击卡死（freeze，非崩溃）

卡死 = 死循环或 UI 线程同步 I/O 阻塞。已加 try-catch 仍卡死，说明是循环或阻塞。

**重点排查 FileService.createFile() 的去重 while 循环**：
```
while (this.fileExists(finalPath)) { ... counter++; }
```
若 `fs.accessSync` 在某些情况下不抛异常 → `fileExists` 恒为 true → 死循环。

### 修复要求

1. **createFile 加循环上限保护**：counter 超过 1000 直接 break/return null
2. **加 hilog 诊断日志**（域 0x0000，tag "TuiSave"）在以下位置打点：
   - saveFile() 入口
   - createFile() 入口/出口/每次循环
   - writeFile() 入口/openSync 前后/出口
   - ensureDir() 入口/出口
   这样真机复现后可在 DevEco 日志面板定位卡死点
3. 检查 `getContext(this).filesDir` 是否在 saveFile 调用链上有空指针风险

## Steps

- [ ] Step 1: 修正 tui_save.svg 为磁盘图标
- [ ] Step 2: FileService.createFile 加循环上限 + 全链路 hilog
- [ ] Step 3: saveFile() 加 hilog 打点
- [ ] Step 4: 报告改了哪些文件

## Checkpoint

**Status**: `pending`
**Assigned to**: Claude Code
