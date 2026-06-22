/**
 * FileService — 文件系统服务封装
 *
 * 封装 HarmonyOS @ohos.file.fs API，提供统一的文件操作接口。
 * 对标 tui.editor 的文件管理能力。
 *
 * 作为全局单例使用，类似 EditorContext：
 *   import { fileService } from '../services/FileService';
 *   fileService.setBaseDir(context.filesDir + '/docs');
 *   const files = fileService.listFiles();
 */

import fs from '@ohos.file.fs';

// ── 文件打开模式常量 ──
// HarmonyOS 文件打开标志位（bitwise OR 组合）
// 使用十进制以避免 ArkTS 八进制字面量兼容性问题
const OPEN_MODE_READ_ONLY: number = 0;      // 0o0
const OPEN_MODE_WRITE_ONLY: number = 1;     // 0o1
const OPEN_MODE_CREATE: number = 64;         // 0o100
const OPEN_MODE_TRUNC: number = 128;         // 0o200
const OPEN_MODE_CREATE_WRITE_TRUNC: number =
  OPEN_MODE_CREATE | OPEN_MODE_WRITE_ONLY | OPEN_MODE_TRUNC;

// ── 数据类 ──

/** 文件条目（纯数据，不含 UI 字段） */
export class FileItem {
  name: string = '';
  path: string = '';
  isDirectory: boolean = false;
  size: number = 0;
}

// ── 文件系统服务 ──

export class FileService {
  private baseDir: string = '';

  constructor(baseDir?: string) {
    if (baseDir === undefined) {
      return;
    }
    this.baseDir = baseDir;
  }

  /** 设置基础目录（通常是 context.filesDir + '/docs'） */
  setBaseDir(dir: string): void {
    this.baseDir = dir;
  }

  /** 获取基础目录 */
  getBaseDir(): string {
    return this.baseDir;
  }

  /** 确保目录存在，不存在则递归创建 */
  ensureDir(dir: string): boolean {
    if (dir.length === 0) {
      return false;
    }
    try {
      fs.accessSync(dir);
      return true;
    } catch (_e) {
      // 目录不存在，尝试创建
    }
    try {
      fs.mkdirSync(dir, true);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /** 列出指定目录下的 .md 文件 */
  listFiles(dir?: string): FileItem[] {
    const targetDir: string = dir !== undefined ? dir : this.baseDir;
    const result: FileItem[] = [];
    if (targetDir.length === 0) {
      return result;
    }

    // 确保目录存在
    if (!this.ensureDir(targetDir)) {
      return result;
    }

    let names: string[];
    try {
      names = fs.listFileSync(targetDir);
    } catch (_e) {
      return result;
    }

    for (let i = 0; i < names.length; i++) {
      const name: string = names[i];
      // 只收集 .md 文件
      if (!name.endsWith('.md')) {
        continue;
      }
      const fullPath: string = targetDir + '/' + name;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          continue;
        }
        const item: FileItem = new FileItem();
        item.name = name;
        item.path = fullPath;
        item.isDirectory = false;
        item.size = stat.size;
        result.push(item);
      } catch (_e) {
        // 跳过无法访问的文件
      }
    }
    return result;
  }

  /** 读取文件全部文本内容 */
  readFile(path: string): string {
    if (path.length === 0) {
      return '';
    }
    try {
      return fs.readTextSync(path);
    } catch (_e) {
      return '';
    }
  }

  /** 写入文本到文件，返回是否成功 */
  writeFile(path: string, content: string): boolean {
    if (path.length === 0) {
      return false;
    }
    try {
      const file = fs.openSync(path, OPEN_MODE_CREATE_WRITE_TRUNC);
      fs.writeSync(file.fd, content);
      fs.closeSync(file);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /** 创建新的 .md 文件，返回文件路径；失败返回 null */
  createFile(dir: string, name: string): string | null {
    let fileName: string = name;
    if (!fileName.endsWith('.md')) {
      fileName = fileName + '.md';
    }
    const fullPath: string = dir + '/' + fileName;

    // 确保目录存在
    if (!this.ensureDir(dir)) {
      return null;
    }

    // 文件名去重：如果已存在，追加编号
    let finalPath: string = fullPath;
    let counter: number = 1;
    while (this.fileExists(finalPath)) {
      const base: string = fileName.substring(0, fileName.length - 3);
      finalPath = dir + '/' + base + '_' + counter.toString() + '.md';
      counter++;
    }

    // 写入空模板
    const title: string = baseName(fileName);
    const template: string = '# ' + title + '\n\n开始编辑…\n';
    if (!this.writeFile(finalPath, template)) {
      return null;
    }
    return finalPath;
  }

  /** 删除文件，返回是否成功 */
  deleteFile(path: string): boolean {
    if (path.length === 0) {
      return false;
    }
    try {
      fs.unlinkSync(path);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /** 判断文件是否存在 */
  fileExists(path: string): boolean {
    if (path.length === 0) {
      return false;
    }
    try {
      fs.accessSync(path);
      return true;
    } catch (_e) {
      return false;
    }
  }
}

// ── 辅助 ──

/** 从文件路径提取不含扩展名的文件名 */
function baseName(fileName: string): string {
  if (fileName.endsWith('.md')) {
    return fileName.substring(0, fileName.length - 3);
  }
  return fileName;
}

// ── 全局单例 ──

export const fileService: FileService = new FileService();
