/**
 * Inlines — 行内解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/inlines.ts。
 * 处理行内格式：粗体、斜体、删除线、链接、图片、行内代码、转义、换行。
 * 所有函数为纯函数，不持有状态。
 */

import { AstNode, AstNodeType } from './Node';
import { linkRefs, LinkRefDef } from './LinkRefs';

/** 解析 destination 的返回值（parseAngleDest / parseBareDest） */
class DestResult {
  url: string = '';
  nextIdx: number = 0;
}

/** 解析 title 的返回值（parseTitle） */
class TitleResult {
  title: string = '';
  nextIdx: number = 0;
}

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
      // 引用式图片 ![alt][label] / ![alt][]
      const refImgResult: InlineMatchResult | null = tryParseReferenceLink(text, i, true);
      if (refImgResult) {
        const imgNode: AstNode = new AstNode(AstNodeType.Image);
        imgNode.attrs.alt = refImgResult.text;
        imgNode.attrs.url = refImgResult.url;
        imgNode.attrs.title = refImgResult.title;
        parent.appendChild(imgNode);
        i = refImgResult.nextIndex;
        continue;
      }
    }

    // ── 链接 [text](url) / 引用式链接 [text][label] / [text][] / [text] ──
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
      // 引用式链接 full/collapsed/shortcut
      const refLinkResult: InlineMatchResult | null = tryParseReferenceLink(text, i, false);
      if (refLinkResult) {
        const linkNode: AstNode = new AstNode(AstNodeType.Link);
        parseInlines(refLinkResult.text, linkNode);
        linkNode.attrs.url = refLinkResult.url;
        linkNode.attrs.title = refLinkResult.title;
        parent.appendChild(linkNode);
        i = refLinkResult.nextIndex;
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

/** 尝试解析链接 [text](url "title") 或图片 ![alt](url "title") */
function tryParseLinkOrImage(text: string, start: number, isImage: boolean): InlineMatchResult | null {
  const bracketStart: number = isImage ? start + 1 : start;
  const bracketEnd: number = findClosingBracket(text, bracketStart);
  if (bracketEnd < 0) return null;
  if (bracketEnd + 1 >= text.length || text[bracketEnd + 1] !== '(') return null;

  const destResult: DestAndTitleResult | null = parseDestAndTitle(text, bracketEnd + 2);
  if (!destResult) return null;

  const result: InlineMatchResult = new InlineMatchResult();
  result.text = text.substring(bracketStart + 1, bracketEnd);
  result.url = destResult.url;
  result.title = destResult.title;
  result.nextIndex = destResult.nextIdx;
  return result;
}

class DestAndTitleResult {
  url: string = '';
  title: string = '';
  nextIdx: number = 0;
}

/** 解析 destination + optional title，严格按 CommonMark 规则 */
function parseDestAndTitle(text: string, start: number): DestAndTitleResult | null {
  let pos: number = start;
  const len: number = text.length;

  // 跳过可选空白
  pos = skipSpace(text, pos);
  if (pos >= len) return null;

  // 空 destination: ]()
  if (text[pos] === ')') {
    const r: DestAndTitleResult = new DestAndTitleResult();
    r.url = '';
    r.title = '';
    r.nextIdx = pos + 1;
    return r;
  }

  // 解析 destination
  let urlRaw: string = '';
  if (text[pos] === '<') {
    // 尖括号式 <...>
    const angleRes = parseAngleDest(text, pos);
    if (!angleRes) return null;
    urlRaw = angleRes.url;
    pos = angleRes.nextIdx;
  } else {
    // 裸式
    const bareRes = parseBareDest(text, pos);
    if (!bareRes) return null;
    urlRaw = bareRes.url;
    pos = bareRes.nextIdx;
  }

  // 反斜杠转义解析 + 空格归一化
  let url: string = resolveBackslashEscapes(urlRaw);
  url = encodeSpacesInUrl(url);

  // destination 后空白 → 可选 title → 空白 → )
  pos = skipSpace(text, pos);
  if (pos >= len) return null;

  let title: string = '';
  if (text[pos] === ')') {
    // 无 title
    const r: DestAndTitleResult = new DestAndTitleResult();
    r.url = url;
    r.title = '';
    r.nextIdx = pos + 1;
    return r;
  }

  // 此处必须有合法 title，否则不是链接
  const titleRes = parseTitle(text, pos);
  if (!titleRes) return null;
  title = titleRes.title;
  pos = titleRes.nextIdx;

  // title 后空白 → )
  pos = skipSpace(text, pos);
  if (pos >= len || text[pos] !== ')') return null;

  const r: DestAndTitleResult = new DestAndTitleResult();
  r.url = url;
  r.title = title;
  r.nextIdx = pos + 1;
  return r;
}

/** 解析尖括号式 destination `<...>` */
export function parseAngleDest(text: string, start: number): DestResult | null {
  let pos: number = start + 1; // 跳过 '<'
  const len: number = text.length;
  let content: string = '';

  while (pos < len) {
    const ch: string = text[pos];
    if (ch === '\n') return null; // 不许换行
    if (ch === '\\' && pos + 1 < len) {
      // 反斜杠转义——保留原始供后续解析
      content += ch + text[pos + 1];
      pos += 2;
      continue;
    }
    if (ch === '<') return null; // 未转义的 < 非法
    if (ch === '>') {
      // 找到闭合 >
      const url: string = resolveBackslashEscapes(content);
      const r: DestResult = new DestResult();
      r.url = url;
      r.nextIdx = pos + 1;
      return r;
    }
    content += ch;
    pos++;
  }
  return null; // 没有闭合 >
}

/** 解析裸式 destination（不以 < 开头） */
export function parseBareDest(text: string, start: number): DestResult | null {
  let pos: number = start;
  const len: number = text.length;
  let content: string = '';
  let depth: number = 0;

  while (pos < len) {
    const ch: string = text[pos];
    if (ch === '\\' && pos + 1 < len) {
      // 反斜杠转义——保留原始
      content += ch + text[pos + 1];
      pos += 2;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
      // 遇空白停止
      const url: string = resolveBackslashEscapes(content);
      const r: DestResult = new DestResult();
      r.url = url;
      r.nextIdx = pos;
      return r;
    }
    if (ch === '(') {
      depth++;
      content += ch;
      pos++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth < 0) {
        // 未配对的 )，结束 destination（是链接的闭合 )）
        const url: string = resolveBackslashEscapes(content);
        const r: DestResult = new DestResult();
        r.url = url;
        r.nextIdx = pos;
        return r; // 不消费 )
      }
      content += ch;
      pos++;
      continue;
    }
    content += ch;
    pos++;
  }

  // 文本末尾
  const url: string = resolveBackslashEscapes(content);
  const r: DestResult = new DestResult();
  r.url = url;
  r.nextIdx = pos;
  return r;
}

/** 解析 title："..."、'...' 或 (...) */
export function parseTitle(text: string, start: number): TitleResult | null {
  if (start >= text.length) return null;
  const delimiter: string = text[start];
  if (delimiter !== '"' && delimiter !== "'" && delimiter !== '(') return null;

  let pos: number = start + 1;
  const len: number = text.length;
  let raw: string = '';

  if (delimiter === '(') {
    // 括号式 title，不允许嵌套 (
    while (pos < len) {
      const ch: string = text[pos];
      if (ch === '\\' && pos + 1 < len) {
        raw += ch + text[pos + 1];
        pos += 2;
        continue;
      }
      if (ch === '(') return null; // 不许嵌套
      if (ch === ')') {
        const title: string = resolveBackslashEscapes(raw);
        const r: TitleResult = new TitleResult();
        r.title = title;
        r.nextIdx = pos + 1;
        return r;
      }
      if (ch === '\n') return null;
      raw += ch;
      pos++;
    }
    return null;
  }

  // "..." 或 '...' 定界
  while (pos < len) {
    const ch: string = text[pos];
    if (ch === '\\' && pos + 1 < len) {
      raw += ch + text[pos + 1];
      pos += 2;
      continue;
    }
    if (ch === '\n') return null;
    if (ch === delimiter) {
      const title: string = resolveBackslashEscapes(raw);
      const r: TitleResult = new TitleResult();
      r.title = title;
      r.nextIdx = pos + 1;
      return r;
    }
    raw += ch;
    pos++;
  }
  return null;
}

/** 跳过空白字符（空格、制表符、换行等） */
function skipSpace(text: string, start: number): number {
  let pos: number = start;
  while (pos < text.length) {
    const ch: string = text[pos];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
      pos++;
    } else {
      break;
    }
  }
  return pos;
}

/** 解析反斜杠转义：\X → X（X 为 ASCII 标点符号） */
export function resolveBackslashEscapes(s: string): string {
  let result: string = '';
  let i: number = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length && isEscapable(s[i + 1])) {
      result += s[i + 1];
      i += 2;
    } else {
      result += s[i];
      i++;
    }
  }
  return result;
}

/** URL 里字面空格编码为 %20 */
export function encodeSpacesInUrl(url: string): string {
  let result: string = '';
  for (let i: number = 0; i < url.length; i++) {
    if (url[i] === ' ') {
      result += '%20';
    } else {
      result += url[i];
    }
  }
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

// ── 引用式链接解析 ──

/** 尝试解析引用式链接/图片（full/collapsed/shortcut）。
 *  前置条件：tryParseLinkOrImage 已失败（无内联 (...) 或解析失败）。*/
function tryParseReferenceLink(text: string, start: number, isImage: boolean): InlineMatchResult | null {
  const bracketStart: number = isImage ? start + 1 : start;
  const bracketEnd: number = findClosingBracket(text, bracketStart);
  if (bracketEnd < 0) return null;

  const contentText: string = text.substring(bracketStart + 1, bracketEnd);
  const afterEnd: number = bracketEnd + 1;
  const len: number = text.length;

  // Full reference: [text][label] 或 Collapsed: [text][]
  if (afterEnd < len && text[afterEnd] === '[') {
    const labelEnd: number = findClosingBracket(text, afterEnd);
    if (labelEnd >= 0) {
      let label: string = text.substring(afterEnd + 1, labelEnd);
      // Collapsed: empty label → use text as label
      if (label === '') {
        label = contentText;
      }
      const def: LinkRefDef | undefined = linkRefs.get(label);
      if (def) {
        const result: InlineMatchResult = new InlineMatchResult();
        result.text = contentText;
        result.url = def.url;
        result.title = def.title;
        result.nextIndex = labelEnd + 1;
        return result;
      }
    }
  }

  // Shortcut reference: [text] — only for links, not images
  // Must not start with ^ (footnote exclusion), and not followed by ( or [
  if (!isImage && !contentText.startsWith('^')) {
    if (afterEnd >= len || (text[afterEnd] !== '(' && text[afterEnd] !== '[')) {
      const def: LinkRefDef | undefined = linkRefs.get(contentText);
      if (def) {
        const result: InlineMatchResult = new InlineMatchResult();
        result.text = contentText;
        result.url = def.url;
        result.title = def.title;
        result.nextIndex = afterEnd; // only consume [text]
        return result;
      }
    }
  }

  return null;
}

// ── 链接引用定义行解析 ──

/** 解析单行链接引用定义行的返回类型 */
export class LinkRefDefParseResult {
  label: string = '';
  def: LinkRefDef = new LinkRefDef();
}

/**
 * 解析单行链接引用定义 [label]: destination "title"
 * 返回 label + LinkRefDef，若不是合法定义行则返回 null。
 * 复用 parseAngleDest / parseBareDest / parseTitle / resolveBackslashEscapes / encodeSpacesInUrl。
 */
export function parseLinkRefDefLine(line: string): LinkRefDefParseResult | null {
  // Step 1: Skip up to 3 spaces indent
  let pos: number = 0;
  while (pos < line.length && line[pos] === ' ') {
    pos++;
  }
  if (pos > 3) return null;

  // Must start with [
  if (pos >= line.length || line[pos] !== '[') return null;
  pos++; // skip [

  // Find ]:
  const colonIdx: number = line.indexOf(']:', pos);
  if (colonIdx < 0) return null;

  // Extract raw label
  const rawLabel: string = line.substring(pos, colonIdx);

  // Label must not be empty and must not contain line breaks
  if (rawLabel.length === 0) return null;
  for (let i: number = 0; i < rawLabel.length; i++) {
    if (rawLabel[i] === '\n' || rawLabel[i] === '\r') return null;
  }

  // Resolve backslash escapes in label
  const label: string = resolveBackslashEscapes(rawLabel);

  // After ]: parse destination
  pos = colonIdx + 2; // skip ]:

  // Skip whitespace
  while (pos < line.length && (line[pos] === ' ' || line[pos] === '\t')) {
    pos++;
  }

  // Must have a destination
  if (pos >= line.length) return null;

  let url: string = '';
  if (line[pos] === '<') {
    const angleRes: DestResult | null = parseAngleDest(line, pos);
    if (!angleRes) return null;
    // parseAngleDest already resolves backslash escapes
    url = encodeSpacesInUrl(angleRes.url);
    pos = angleRes.nextIdx;
  } else {
    const bareRes: DestResult | null = parseBareDest(line, pos);
    if (!bareRes) return null;
    // parseBareDest already resolves backslash escapes; destination must be non-empty
    const resolved: string = bareRes.url;
    if (resolved === '') return null;
    url = encodeSpacesInUrl(resolved);
    pos = bareRes.nextIdx;
  }

  // Skip whitespace
  while (pos < line.length && (line[pos] === ' ' || line[pos] === '\t')) {
    pos++;
  }

  // Optional title
  let title: string = '';
  if (pos < line.length) {
    const titleRes: TitleResult | null = parseTitle(line, pos);
    if (titleRes) {
      title = titleRes.title;
      pos = titleRes.nextIdx;
    }
  }

  // Only whitespace remaining
  while (pos < line.length && (line[pos] === ' ' || line[pos] === '\t')) {
    pos++;
  }
  if (pos < line.length) return null;

  const result: LinkRefDefParseResult = new LinkRefDefParseResult();
  result.label = label;
  const def: LinkRefDef = new LinkRefDef();
  def.url = url;
  def.title = title;
  result.def = def;
  return result;
}
