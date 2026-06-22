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
import hilog from '@ohos.hilog';

const SAVE_DOMAIN: number = 0x0000;
const SAVE_TAG: string = 'TuiSave';

// ── 文件打开模式常量 ──
// 使用 fs.OpenMode 枚举确保与 HarmonyOS @ohos.file.fs API 兼容
// 避免硬编码十进制值（不同系统的 O_TRUNC 等标志值可能不同）
const OPEN_MODE_CREATE_WRITE_TRUNC: number =
  fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC;

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
    hilog.info(SAVE_DOMAIN, SAVE_TAG, 'ensureDir entry dir=%{public}s', dir);
    if (dir.length === 0) {
      hilog.warn(SAVE_DOMAIN, SAVE_TAG, 'ensureDir exit: empty dir');
      return false;
    }
    try {
      if (fs.accessSync(dir)) {
        hilog.info(SAVE_DOMAIN, SAVE_TAG, 'ensureDir exit: already exists');
        return true;
      }
    } catch (_e) {
      // 出错继续尝试创建
    }
    try {
      fs.mkdirSync(dir, true);
      hilog.info(SAVE_DOMAIN, SAVE_TAG, 'ensureDir exit: created ok');
      return true;
    } catch (_e) {
      hilog.error(SAVE_DOMAIN, SAVE_TAG, 'ensureDir exit: mkdirSync failed');
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
    hilog.info(SAVE_DOMAIN, SAVE_TAG, 'writeFile entry path=%{public}s len=%{public}d', path, content.length);
    if (path.length === 0) {
      hilog.warn(SAVE_DOMAIN, SAVE_TAG, 'writeFile exit: empty path');
      return false;
    }
    try {
      hilog.info(SAVE_DOMAIN, SAVE_TAG, 'writeFile openSync before');
      const file = fs.openSync(path, OPEN_MODE_CREATE_WRITE_TRUNC);
      hilog.info(SAVE_DOMAIN, SAVE_TAG, 'writeFile openSync ok fd=%{public}d', file.fd);
      fs.writeSync(file.fd, content);
      fs.closeSync(file);
      hilog.info(SAVE_DOMAIN, SAVE_TAG, 'writeFile exit: ok');
      return true;
    } catch (_e) {
      hilog.error(SAVE_DOMAIN, SAVE_TAG, 'writeFile exit: exception');
      return false;
    }
  }

  /** 创建新的 .md 文件，返回文件路径；失败返回 null */
  createFile(dir: string, name: string): string | null {
    hilog.info(SAVE_DOMAIN, SAVE_TAG, 'createFile entry dir=%{public}s name=%{public}s', dir, name);
    let fileName: string = name;
    if (!fileName.endsWith('.md')) {
      fileName = fileName + '.md';
    }
    const fullPath: string = dir + '/' + fileName;

    // 确保目录存在
    if (!this.ensureDir(dir)) {
      hilog.error(SAVE_DOMAIN, SAVE_TAG, 'createFile exit: ensureDir failed');
      return null;
    }

    // 文件名去重：如果已存在，追加编号
    // 加最大迭代保护，防止 fileExists 恒为 true 导致死循环
    const MAX_DEDUP: number = 1000;
    let finalPath: string = fullPath;
    let counter: number = 1;
    while (this.fileExists(finalPath)) {
      hilog.warn(SAVE_DOMAIN, SAVE_TAG, 'createFile dedup loop counter=%{public}d path=%{public}s', counter, finalPath);
      if (counter > MAX_DEDUP) {
        hilog.error(SAVE_DOMAIN, SAVE_TAG, 'createFile exit: dedup counter exceeded %{public}d', MAX_DEDUP);
        return null;
      }
      const base: string = fileName.substring(0, fileName.length - 3);
      finalPath = dir + '/' + base + '_' + counter.toString() + '.md';
      counter++;
    }

    // 写入空模板
    const title: string = baseName(fileName);
    const template: string = '# ' + title + '\n\n开始编辑…\n';
    if (!this.writeFile(finalPath, template)) {
      hilog.error(SAVE_DOMAIN, SAVE_TAG, 'createFile exit: writeFile failed');
      return null;
    }
    hilog.info(SAVE_DOMAIN, SAVE_TAG, 'createFile exit: ok path=%{public}s', finalPath);
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
      return fs.accessSync(path);
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
