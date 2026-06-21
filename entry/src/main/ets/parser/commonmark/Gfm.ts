/**
 * Gfm — GitHub Flavored Markdown 扩展解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/gfm/。
 * 处理 GFM 特有语法：表格、任务列表、删除线、自动链接、脚注。
 * 与 Blocks / Inlines 协作：块级 GFM 从 Blocks.tryParseBlock 调用，
 * 行内 GFM（删除线/自动链接）已整合在 Inlines 中，此处提供表格解析。
 */

import { AstNode, AstNodeType } from './Node';
import { ParseState } from './ParseState';
import { parseInlines } from './Inlines';

/**
 * 尝试解析 GFM 块级语法（表格、脚注定义）。
 * 由 Blocks.tryParseBlock() 在标准块解析失败后调用。
 */
export function tryParseGfmBlock(state: ParseState): AstNode | null {
  const line: string = state.currentLine();

  // 脚注定义 [^label]: content
  if (line.startsWith('[^') && line.indexOf(']:') >= 0) {
    return parseFootnoteDef(state);
  }
  // 表格需要管道符
  if (line.indexOf('|') < 0) return null;

  return tryParseTable(state);
}

/**
 * 解析 GFM 管道表格。
 * 格式：
 *   | Header 1 | Header 2 |
 *   |----------|:--------:|
 *   | Cell 1   | Cell 2   |
 */
export function tryParseTable(state: ParseState): AstNode | null {
  const saved: number = state.save();

  // 第一行：表头
  const headerLine: string = state.currentLine();
  const headerCells: string[] = splitTableRow(headerLine);
  if (headerCells.length < 2) { state.restore(saved); return null; }
  state.nextLine();

  if (state.isEnd()) { state.restore(saved); return null; }

  // 第二行：分隔行
  const sepLine: string = state.currentLine();
  const sepCells: string[] = splitTableRow(sepLine);
  if (sepCells.length < 2) { state.restore(saved); return null; }

  // 验证分隔行（每个 cell 必须是 :?-{3,}:? 格式）
  if (!isTableSeparator(sepCells)) { state.restore(saved); return null; }
  state.nextLine();

  // 解析对齐
  const aligns: string[] = [];
  for (let i = 0; i < sepCells.length; i++) {
    const c: string = sepCells[i].trim();
    if (c.startsWith(':') && c.endsWith(':')) {
      aligns.push('center');
    } else if (c.endsWith(':')) {
      aligns.push('right');
    } else {
      aligns.push('left');
    }
  }

  const table: AstNode = new AstNode(AstNodeType.Table);
  // 存储对齐信息到 table 的 attrs（通过扩展字段）
  // ArkTS 严格模式下无法动态添加字段，此处将对齐序列化存储
  // 实际对齐信息在渲染阶段通过每个 cell 的索引映射

  // ── 表头 ──
  const head: AstNode = new AstNode(AstNodeType.TableHead);
  const headRow: AstNode = new AstNode(AstNodeType.TableRow);
  headRow.attrs.headerRow = true;
  for (let i = 0; i < headerCells.length; i++) {
    const cell: AstNode = new AstNode(AstNodeType.TableCell);
    // 将对齐信息存储到 cell
    cell.attrs.info = aligns.length > i ? aligns[i] : 'left';
    parseInlines(headerCells[i].trim(), cell);
    headRow.appendChild(cell);
  }
  head.appendChild(headRow);
  table.appendChild(head);

  // ── 表体 ──
  const body: AstNode = new AstNode(AstNodeType.TableBody);
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (line.indexOf('|') < 0) break;
    const cells: string[] = splitTableRow(line);
    if (cells.length < 2) break;
    const row: AstNode = new AstNode(AstNodeType.TableRow);
    for (let i = 0; i < cells.length; i++) {
      const cell: AstNode = new AstNode(AstNodeType.TableCell);
      cell.attrs.info = aligns.length > i ? aligns[i] : 'left';
      parseInlines(cells[i].trim(), cell);
      row.appendChild(cell);
    }
    body.appendChild(row);
    state.nextLine();
  }
  table.appendChild(body);

  // 将对齐信息存储到 table 节点
  table.attrs.alignments = aligns;
  return table;
}

/**
 * 解析 GFM 脚注定义 [^label]: content
 */
export function parseFootnoteDef(state: ParseState): AstNode | null {
  const line: string = state.currentLine();
  const bracketEnd: number = line.indexOf(']');
  if (bracketEnd < 0) return null;
  const label: string = line.substring(2, bracketEnd);
  const colonIdx: number = line.indexOf(']:');
  if (colonIdx < 0) return null;

  // 脚注内容（:] 之后的部分 + 后续缩进行）
  let content: string = line.substring(colonIdx + 2).trim();
  state.nextLine();

  while (!state.isEnd()) {
    const nextLine: string = state.currentLine();
    if (nextLine === '') break;
    // 缩进续行（4 空格或 tab）
    if (nextLine.startsWith('    ') || nextLine.startsWith('\t')) {
      content += ' ' + nextLine.trimStart();
      state.nextLine();
    } else {
      break;
    }
  }

  const node: AstNode = new AstNode(AstNodeType.FootnoteDef);
  node.text = label;
  // 用 attrs.url 存储标签，attrs.title 存储内容
  node.attrs.url = label;
  node.attrs.alt = content;
  parseInlines(content, node);
  return node;
}

// ── 辅助 ──

/** 分割表格行，去除首尾管道符 */
function splitTableRow(line: string): string[] {
  let trimmed: string = line.trim();
  // 去除首尾管道符
  if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
  // 按 | 分割
  const parts: string[] = [];
  let current: string = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '|'; // 转义的管道符
      i++;
    } else if (trimmed[i] === '|') {
      parts.push(current);
      current = '';
    } else {
      current += trimmed[i];
    }
  }
  parts.push(current);
  return parts;
}

/** 验证分隔行格式 */
function isTableSeparator(cells: string[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    const c: string = cells[i].trim();
    // 匹配 :?-{3,}:?
    let valid: boolean = true;
    let dashCount: number = 0;
    for (let j = 0; j < c.length; j++) {
      if (c[j] === '-') {
        dashCount++;
      } else if (c[j] === ':' && (j === 0 || j === c.length - 1)) {
        // 冒号只能在开头或结尾
      } else if (c[j] === ' ') {
        // 允许空格
      } else {
        valid = false;
        break;
      }
    }
    if (!valid || dashCount < 3) return false;
  }
  return true;
}
