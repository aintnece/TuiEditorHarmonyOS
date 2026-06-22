# Active Task

## Objective

修复 FileService 文件存在判断 Bug（根因已定位）

## Root Cause（已通过 hilog 确认）

`fs.accessSync(path)` 在 HarmonyOS 返回 **boolean**（文件存在 true，不存在 false），**不抛异常**。

现有代码错误假设「不存在会抛异常」：
```typescript
fileExists(path): boolean {
  try {
    fs.accessSync(path);   // 返回值被忽略！不存在时返回 false 但不抛异常
    return true;            // → 恒返回 true
  } catch (_e) { return false; }
}
```

后果：`createFile` 去重循环 `while (fileExists(finalPath))` 恒为 true → 死循环到 1000 上限 → 返回 null → "无法创建文件"。

日志证据：
```
createFile dedup loop counter=1 path=.../未命名.md
createFile dedup loop counter=2 path=.../未命名_1.md
...（无限循环直到 1000）
```

## Fix

1. **`fileExists()`**：使用 accessSync 的返回值
   ```typescript
   fileExists(path: string): boolean {
     if (path.length === 0) return false;
     try {
       return fs.accessSync(path);   // 直接返回 boolean
     } catch (_e) {
       return false;
     }
   }
   ```

2. **`ensureDir()`**：同样的反模式，改用返回值判断
   ```typescript
   ensureDir(dir: string): boolean {
     if (dir.length === 0) return false;
     try {
       if (fs.accessSync(dir)) return true;   // 存在才返回 true
     } catch (_e) { /* 出错继续尝试创建 */ }
     try {
       fs.mkdirSync(dir, true);
       return true;
     } catch (_e) { return false; }
   }
   ```

3. **验证 accessSync 返回类型**：如果 ArkTS 编译器报 accessSync 返回 void，则改用 `fs.access` 的同步等价或 try-catch + statSync 判断。先按返回 boolean 实现。

## Steps

- [x] Step 1: 修复 FileService.fileExists() 使用返回值 ✓
- [x] Step 2: 修复 FileService.ensureDir() 使用返回值 ✓
- [x] Step 3: 保留 hilog（待真机确认修复后再清理） ✓

## Checkpoint

**Status**: `done`
**Assigned to**: Claude Code
