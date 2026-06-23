/**
 * Inlines — 行内解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/inlines.ts。
 * 处理行内格式：粗体、斜体、删除线、链接、图片、行内代码、转义、换行。
 * 所有函数为纯函数，不持有状态。
 */

import { AstNode, AstNodeType } from './Node';

/**
 * 解析行内 Markdown 文本，将生成的节点添加到 parent。
 * 这是行内解析的主入口。
 */
export function parseInlines(text: string, parent: AstNode): void {
  let i: number = 0;
  const len: number = text.length;

  while (i < len) {
    // ── 转义字符 ──
    if (text[i] === '\\' && i + 1 < len) {
      const escaped: string = text[i + 1];
      // 只有 ASCII 标点符号需要转义
      if (isEscapable(escaped)) {
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = escaped;
        parent.appendChild(txt);
        i += 2;
        continue;
      } else {
        // 非转义字符，反斜杠保留为普通文本
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = '\\';
        parent.appendChild(txt);
        i++;
        continue;
      }
    }

    // ── 硬换行（行尾两个空格）──
    if (text[i] === ' ' && i + 1 < len && text[i + 1] === ' ') {
      // 检查后面是否紧跟换行（在 Markdown 块处理中已合并为 \n）
      // 这里简化处理：两个空格后紧跟文本换行 → 硬换行
      let j: number = i + 2;
      while (j < len && text[j] === ' ') j++;
      if (j < len && text[j] === '\n') {
        const br: AstNode = new AstNode(AstNodeType.HardBreak);
        parent.appendChild(br);
        i = j + 1; // 跳过空格和 \n
        continue;
      }
    }

    // ── 软换行（单个 \n）──
    if (text[i] === '\n') {
      const br: AstNode = new AstNode(AstNodeType.SoftBreak);
      parent.appendChild(br);
      i++;
      continue;
    }

    // ── 图片 ![...](url) ──
    if (text[i] === '!' && i + 1 < len && text[i + 1] === '[') {
      const result: InlineMatchResult | null = tryParseLinkOrImage(text, i, true);
      if (result) {
        const node: AstNode = new AstNode(AstNodeType.Image);
        node.attrs.alt = result.text;
        node.attrs.url = result.url;
        node.attrs.title = result.title;
        parent.appendChild(node);
        i = result.nextIndex;
        continue;
      }
    }

    // ── 链接 [text](url) ──
    if (text[i] === '[') {
      const result: InlineMatchResult | null = tryParseLinkOrImage(text, i, false);
      if (result) {
        const node: AstNode = new AstNode(AstNodeType.Link);
        parseInlines(result.text, node);
        node.attrs.url = result.url;
        node.attrs.title = result.title;
        parent.appendChild(node);
        i = result.nextIndex;
        continue;
      }
    }

    // ── 粗体 **text** 或 __text__ ──
    if (i + 1 < len && ((text[i] === '*' && text[i + 1] === '*') ||
                         (text[i] === '_' && text[i + 1] === '_'))) {
      const marker: string = text[i] + text[i + 1];
      const end: number = text.indexOf(marker, i + 2);
      if (end >= 0) {
        const node: AstNode = new AstNode(AstNodeType.Strong);
        parseInlines(text.substring(i + 2, end), node);
        parent.appendChild(node);
        i = end + 2;
        continue;
      }
    }

    // ── 删除线 ~~text~~ ──
    if (i + 1 < len && text[i] === '~' && text[i + 1] === '~') {
      const end: number = text.indexOf('~~', i + 2);
      if (end >= 0) {
        const node: AstNode = new AstNode(AstNodeType.Strike);
        parseInlines(text.substring(i + 2, end), node);
        parent.appendChild(node);
        i = end + 2;
        continue;
      }
    }

    // ── 斜体 *text* 或 _text_ ──
    if (text[i] === '*' || text[i] === '_') {
      const ch: string = text[i];
      // 双字符标记已在上面处理，这里处理单字符
      if (i + 1 < len && text[i + 1] !== ch) {
        const end: number = text.indexOf(ch, i + 1);
        if (end > i + 1) {
          // 确保不跨越换行
          let hasNewline: boolean = false;
          for (let k: number = i + 1; k < end; k++) {
            if (text[k] === '\n') { hasNewline = true; break; }
          }
          if (!hasNewline) {
            const node: AstNode = new AstNode(AstNodeType.Emph);
            parseInlines(text.substring(i + 1, end), node);
            parent.appendChild(node);
            i = end + 1;
            continue;
          }
        }
      }
    }

    // ── 行内代码 `code` ──
    if (text[i] === '`') {
      const end: number = text.indexOf('`', i + 1);
      if (end >= 0) {
        const node: AstNode = new AstNode(AstNodeType.Code);
        node.text = text.substring(i + 1, end);
        parent.appendChild(node);
        i = end + 1;
        continue;
      }
    }

    // ── 自动链接 <url> (GFM) ──
    if (text[i] === '<' && i + 2 < len) {
      const end: number = text.indexOf('>', i + 1);
      if (end >= 0) {
        const inner: string = text.substring(i + 1, end);
        if (isAutolink(inner)) {
          const node: AstNode = new AstNode(AstNodeType.Link);
          node.attrs.url = inner;
          const txt: AstNode = new AstNode(AstNodeType.Text);
          txt.text = inner;
          node.appendChild(txt);
          parent.appendChild(node);
          i = end + 1;
          continue;
        }
      }
    }

    // ── 脚注引用 [^label] (GFM) ──
    if (text[i] === '[' && i + 2 < len && text[i + 1] === '^') {
      const end: number = text.indexOf(']', i + 2);
      if (end >= 0) {
        const label: string = text.substring(i + 2, end);
        // 标签不能包含换行或空白
        let valid: boolean = label.length > 0;
        for (let k: number = 0; k < label.length; k++) {
          if (label[k] === '\n' || label[k] === ' ' || label[k] === '\t') {
            valid = false;
            break;
          }
        }
        if (valid) {
          const ref: AstNode = new AstNode(AstNodeType.FootnoteRef);
          ref.text = label;
          parent.appendChild(ref);
          i = end + 1;
          continue;
        }
      }
    }

    // ── 实体引用 &amp; &lt; 等 ──
    if (text[i] === '&' && i + 2 < len) {
      const entity: string | null = tryParseEntity(text, i);
      if (entity) {
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = entity;
        parent.appendChild(txt);
        i += entity.length + 2; // rough estimate — 实际按原文本长度跳
        // 用找到的 ; 位置
        const semi: number = text.indexOf(';', i);
        if (semi >= 0) { i = semi + 1; }
        continue;
      }
    }

    // ── 普通文本 ──
    const txt: AstNode = new AstNode(AstNodeType.Text);
    txt.text = text[i];
    parent.appendChild(txt);
    i++;
  }
}

// ── 辅助类型与函数 ──

class InlineMatchResult {
  text: string = '';
  url: string = '';
  title: string = '';
  nextIndex: number = 0;
}

/** 尝试解析链接 [text](url) 或图片 ![alt](url) */
function tryParseLinkOrImage(text: string, start: number, isImage: boolean): InlineMatchResult | null {
  const bracketStart: number = isImage ? start + 1 : start;
  const bracketEnd: number = findClosingBracket(text, bracketStart);
  if (bracketEnd < 0) return null;
  if (bracketEnd + 1 >= text.length || text[bracketEnd + 1] !== '(') return null;

  const parenEnd: number = findClosingParen(text, bracketEnd + 2);
  if (parenEnd < 0) return null;

  const result: InlineMatchResult = new InlineMatchResult();
  result.text = text.substring(bracketStart + 1, bracketEnd);
  const urlPart: string = text.substring(bracketEnd + 2, parenEnd);

  // 解析 URL 和可选的 title
  const spaceIdx: number = findFirstSpace(urlPart);
  if (spaceIdx >= 0) {
    result.url = urlPart.substring(0, spaceIdx).trim();
    let titlePart: string = urlPart.substring(spaceIdx + 1).trim();
    // 去除引号
    if ((titlePart.startsWith('"') && titlePart.endsWith('"')) ||
        (titlePart.startsWith("'") && titlePart.endsWith("'")) ||
        (titlePart.startsWith('(') && titlePart.endsWith(')'))) {
      titlePart = titlePart.substring(1, titlePart.length - 1);
    }
    result.title = titlePart;
  } else {
    result.url = urlPart.trim();
  }
  result.nextIndex = parenEnd + 1;
  return result;
}

/** 查找闭合的 ] 方括号（处理嵌套） */
function findClosingBracket(text: string, start: number): number {
  let depth: number = 1;
  for (let i: number = start + 1; i < text.length; i++) {
    if (text[i] === '[') {
      depth++;
    } else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    } else if (text[i] === '\n') {
      return -1; // 不允许跨行
    }
  }
  return -1;
}

/** 查找闭合的 ) 括号 */
function findClosingParen(text: string, start: number): number {
  let depth: number = 1;
  for (let i: number = start; i < text.length; i++) {
    if (text[i] === '(') {
      depth++;
    } else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    } else if (text[i] === '\n') {
      return -1;
    }
  }
  return -1;
}

/** 在字符串中找第一个空格（不在引号内） */
function findFirstSpace(text: string): number {
  let inQuote: string = '';
  for (let i = 0; i < text.length; i++) {
    if (inQuote) {
      if (text[i] === inQuote) inQuote = '';
    } else if (text[i] === '"' || text[i] === "'") {
      inQuote = text[i];
    } else if (text[i] === ' ') {
      return i;
    }
  }
  return -1;
}

/** 可转义的 ASCII 标点符号 */
function isEscapable(ch: string): boolean {
  return ch === '!' || ch === '"' || ch === '#' || ch === '$' || ch === '%' ||
         ch === '&' || ch === "'" || ch === '(' || ch === ')' || ch === '*' ||
         ch === '+' || ch === ',' || ch === '-' || ch === '.' || ch === '/' ||
         ch === ':' || ch === ';' || ch === '<' || ch === '=' || ch === '>' ||
         ch === '?' || ch === '@' || ch === '[' || ch === '\\' || ch === ']' ||
         ch === '^' || ch === '_' || ch === '`' || ch === '{' || ch === '|' ||
         ch === '}' || ch === '~';
}

/** 检测自动链接 <url> 或 <email> */
function isAutolink(text: string): boolean {
  // 简单检测：以协议开头或包含 @
  if (text.startsWith('http://') || text.startsWith('https://') ||
      text.startsWith('ftp://') || text.startsWith('mailto:')) {
    return true;
  }
  if (text.indexOf('@') > 0) return true; // email
  return false;
}

/** 实体引用解码 */
function tryParseEntity(text: string, start: number): string | null {
  // &amp; &lt; &gt; &quot; &apos; &#NNNN; &#xNNNN;
  const semi: number = text.indexOf(';', start);
  if (semi < 0 || semi - start > 20) return null;
  const entity: string = text.substring(start, semi + 1);
  if (entity === '&amp;') return '&';
  if (entity === '&lt;') return '<';
  if (entity === '&gt;') return '>';
  if (entity === '&quot;') return '"';
  if (entity === '&apos;') return "'";
  if (entity === '&nbsp;') return ' ';
  // 数字实体
  if (entity.startsWith('&#')) {
    return '?'; // 简化：返回占位符（完整实现需查 Unicode）
  }
  return null;
}
