/**
 * Inlines — 行内解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/inlines.ts。
 * 处理行内格式：粗体、斜体、删除线、链接、图片、行内代码、转义、换行。
 * 强调/加粗使用 CommonMark 0.31.2 delimiter-run 算法（flanking + rule-of-three）。
 * 所有函数为纯函数，不持有状态。
 */

import { AstNode, AstNodeType } from './Node';
import { linkRefs, LinkRefDef } from './LinkRefs';
import { HTML_ENTITY_PACKED } from './HtmlEntities';

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

/** 实体解析结果：解码值 + 消费到的下一位置 */
class EntityResult {
  value: string = '';
  nextIdx: number = 0;   // 实体之后第一个字符的索引（即 ';' 之后）
}

/**
 * 解析行内 Markdown 文本，将生成的节点添加到 parent。
 * 这是行内解析的主入口。
 */
export function parseInlines(text: string, parent: AstNode): void {
  let i: number = 0;
  const len: number = text.length;
  const out: AstNode[] = [];
  let topDelim: Delimiter | null = null;

  while (i < len) {
    // ── 转义字符 / 反斜杠硬换行 ──
    if (text[i] === '\\' && i + 1 < len) {
      // 反斜杠 + 行结束 → 硬换行
      if (text[i + 1] === '\n') {
        const br: AstNode = new AstNode(AstNodeType.HardBreak);
        out.push(br);
        i += 2;
        while (i < len && text[i] === ' ') { i++; }
        continue;
      }
      const escaped: string = text[i + 1];
      // 只有 ASCII 标点符号需要转义
      if (isEscapable(escaped)) {
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = escaped;
        out.push(txt);
        i += 2;
        continue;
      } else {
        // 非转义字符，反斜杠保留为普通文本
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = '\\';
        out.push(txt);
        i++;
        continue;
      }
    }

    // ── 行结束：软/硬换行（剥换行前尾随空格 + 跳下一行行首空格）──
    if (text[i] === '\n') {
      // 弹出已入 out 的尾随空格 Text 节点并计数
      let spaceCount: number = 0;
      while (out.length > 0) {
        const last: AstNode = out[out.length - 1];
        if (last.type === AstNodeType.Text && last.text === ' ') {
          out.pop();
          spaceCount++;
        } else {
          break;
        }
      }
      const br: AstNode = new AstNode(spaceCount >= 2 ? AstNodeType.HardBreak : AstNodeType.SoftBreak);
      out.push(br);
      i++;
      while (i < len && text[i] === ' ') { i++; }
      continue;
    }

    // ── 图片 ![...](url) ──
    if (text[i] === '!' && i + 1 < len && text[i + 1] === '[') {
      const result: InlineMatchResult | null = tryParseLinkOrImage(text, i, true);
      if (result) {
        const node: AstNode = new AstNode(AstNodeType.Image);
        node.attrs.alt = extractAltText(result.text);
        node.attrs.url = result.url;
        node.attrs.title = result.title;
        out.push(node);
        i = result.nextIndex;
        continue;
      }
      // 引用式图片 ![alt][label] / ![alt][]
      const refImgResult: InlineMatchResult | null = tryParseReferenceLink(text, i, true);
      if (refImgResult) {
        const imgNode: AstNode = new AstNode(AstNodeType.Image);
        imgNode.attrs.alt = extractAltText(refImgResult.text);
        imgNode.attrs.url = refImgResult.url;
        imgNode.attrs.title = refImgResult.title;
        out.push(imgNode);
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
        out.push(node);
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
        out.push(linkNode);
        i = refLinkResult.nextIndex;
        continue;
      }
    }

    // ── 删除线 ~~text~~ ──（保留）
    if (i + 1 < len && text[i] === '~' && text[i + 1] === '~') {
      const end: number = text.indexOf('~~', i + 2);
      if (end >= 0) {
        const node: AstNode = new AstNode(AstNodeType.Strike);
        parseInlines(text.substring(i + 2, end), node);
        out.push(node);
        i = end + 2;
        continue;
      }
    }

    // ── 强调/加粗：* 或 _ ──（delimiter-run 算法，替换原朴素 indexOf 粗体+斜体）
    if (text[i] === '*' || text[i] === '_') {
      const cc: string = text[i];
      // 1) 扫描连续同字符 run
      let j: number = i;
      while (j < len && text[j] === cc) { j++; }
      const numdelims: number = j - i;

      // 2) flanking 判定（before/after 用 '\n' 作行首/行尾哨兵）
      const charBefore: string = (i === 0) ? '\n' : text[i - 1];
      const charAfter: string = (j >= len) ? '\n' : text[j];
      const afterWs: boolean = isUnicodeWhitespace(charAfter);
      const afterPunct: boolean = isPunctuation(charAfter);
      const beforeWs: boolean = isUnicodeWhitespace(charBefore);
      const beforePunct: boolean = isPunctuation(charBefore);

      const leftFlanking: boolean =
        !afterWs && (!afterPunct || beforeWs || beforePunct);
      const rightFlanking: boolean =
        !beforeWs && (!beforePunct || afterWs || afterPunct);

      let canOpen: boolean;
      let canClose: boolean;
      if (cc === '_') {
        canOpen = leftFlanking && (!rightFlanking || beforePunct);
        canClose = rightFlanking && (!leftFlanking || afterPunct);
      } else {  // '*'
        canOpen = leftFlanking;
        canClose = rightFlanking;
      }

      // 3) 产出一个承载整段 run 文本的 Text 节点
      const node: AstNode = new AstNode(AstNodeType.Text);
      node.text = text.substring(i, j);
      out.push(node);

      // 4) 仅当能开或能合时才入栈（既不能开也不能合 → 留作普通文本）
      if (canOpen || canClose) {
        const d: Delimiter = new Delimiter();
        d.ch = cc;
        d.numdelims = numdelims;
        d.origdelims = numdelims;
        d.node = node;
        d.canOpen = canOpen;
        d.canClose = canClose;
        d.previous = topDelim;
        d.next = null;
        if (topDelim !== null) { topDelim.next = d; }
        topDelim = d;
      }

      i = j;
      continue;
    }

    // ── 行内代码 `code`（CommonMark 反引号 run 等长匹配）──
    if (text[i] === '`') {
      // 1) 开 run 长度
      let p: number = i;
      while (p < len && text[p] === '`') { p++; }
      const openLen: number = p - i;
      const contentStart: number = p;

      // 2) 找等长闭 run
      let q: number = p;
      let closeStart: number = -1;
      while (q < len) {
        if (text[q] === '`') {
          let r: number = q;
          while (r < len && text[r] === '`') { r++; }
          const runLen: number = r - q;
          if (runLen === openLen) { closeStart = q; break; }
          q = r;                       // 长度不符，跳过整个 run
        } else {
          q++;
        }
      }

      if (closeStart >= 0) {
        // 3) 内容处理：换行→空格 + 首尾单空格剥离
        let content: string = codeSpanNewlinesToSpaces(text.substring(contentStart, closeStart));
        if (content.length > 0 && codeSpanHasNonSpace(content) &&
            content[0] === ' ' && content[content.length - 1] === ' ') {
          content = content.substring(1, content.length - 1);
        }
        const node: AstNode = new AstNode(AstNodeType.Code);
        node.text = content;
        out.push(node);
        i = closeStart + openLen;
        continue;
      } else {
        // 4) 无闭合：开 run 留字面，仅推进过开 run
        const lit: AstNode = new AstNode(AstNodeType.Text);
        lit.text = text.substring(i, p);
        out.push(lit);
        i = p;
        continue;
      }
    }

    // ── 自动链接 <scheme:uri> / <email> ──
    if (text[i] === '<') {
      const end: number = text.indexOf('>', i + 1);
      if (end >= 0) {
        const inner: string = text.substring(i + 1, end);
        if (isUriAutolink(inner)) {
          const node: AstNode = new AstNode(AstNodeType.Link);
          node.attrs.url = normalizeUri(inner);
          const txt: AstNode = new AstNode(AstNodeType.Text);
          txt.text = inner;
          node.appendChild(txt);
          out.push(node);
          i = end + 1;
          continue;
        }
        if (isEmailAutolink(inner)) {
          const node: AstNode = new AstNode(AstNodeType.Link);
          node.attrs.url = 'mailto:' + normalizeUri(inner);
          const txt: AstNode = new AstNode(AstNodeType.Text);
          txt.text = inner;
          node.appendChild(txt);
          out.push(node);
          i = end + 1;
          continue;
        }
      }
      // ── 行内原始 HTML 标签 ──
      const htmlEnd: number = tryParseHtmlTag(text, i);
      if (htmlEnd > i) {
        const htmlNode: AstNode = new AstNode(AstNodeType.HtmlInline);
        htmlNode.text = text.substring(i, htmlEnd);
        out.push(htmlNode);
        i = htmlEnd;
        continue;
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
          out.push(ref);
          i = end + 1;
          continue;
        }
      }
    }

    // ── 实体引用 &amp; &#NN; &#xHH; 等 ──
    if (text[i] === '&') {
      const er: EntityResult | null = tryParseEntity(text, i);
      if (er !== null) {
        const txt: AstNode = new AstNode(AstNodeType.Text);
        txt.text = er.value;
        out.push(txt);
        i = er.nextIdx;
        continue;
      }
    }

    // ── 普通文本 ──
    const txt: AstNode = new AstNode(AstNodeType.Text);
    txt.text = text[i];
    out.push(txt);
    i++;
  }

  // 扫描结束 → 配对强调 → 挂到 parent
  const proc: EmphasisProcessor = new EmphasisProcessor(out, topDelim);
  proc.process();
  for (let k: number = 0; k < out.length; k++) {
    parent.appendChild(out[k]);
  }
}

// ── 辅助类型与函数 ──

/** 行内代码内容：换行符（\n / \r）各转成一个空格（不折叠） */
function codeSpanNewlinesToSpaces(s: string): string {
  let out: string = '';
  for (let k: number = 0; k < s.length; k++) {
    const ch: string = s[k];
    if (ch === '\n' || ch === '\r') { out += ' '; }
    else { out += ch; }
  }
  return out;
}

/** 是否含至少一个非空格(U+0020)字符 */
function codeSpanHasNonSpace(s: string): boolean {
  for (let k: number = 0; k < s.length; k++) {
    if (s[k] !== ' ') return true;
  }
  return false;
}

class InlineMatchResult {
  text: string = '';
  url: string = '';
  title: string = '';
  nextIndex: number = 0;
}

// ── 强调 delimiter-run 算法辅助类型 ──

/** 强调 delimiter 栈节点（双向链表，对标 commonmark.js delimiters） */
class Delimiter {
  ch: string = '';                    // '*' 或 '_'
  numdelims: number = 0;              // 剩余可用 delimiter 数（会被消耗递减）
  origdelims: number = 0;             // 原始 run 长度（rule-of-three 用，不变）
  node: AstNode | null = null;        // 承载 run 文本的 Text 节点
  canOpen: boolean = false;
  canClose: boolean = false;
  previous: Delimiter | null = null;
  next: Delimiter | null = null;
}

/** Unicode 空白（含行首/行尾哨兵 '\n'，对标 /^\s/） */
function isUnicodeWhitespace(ch: string): boolean {
  if (ch.length === 0) return true;
  const code: number = ch.charCodeAt(0);
  if (code === 32 || (code >= 9 && code <= 13)) return true;        // space, \t \n \v \f \r
  if (code === 0x00A0 || code === 0x1680) return true;
  if (code >= 0x2000 && code <= 0x200A) return true;
  if (code === 0x2028 || code === 0x2029 || code === 0x202F) return true;
  if (code === 0x205F || code === 0x3000 || code === 0xFEFF) return true;
  return false;
}

/** ASCII 标点码点：33-47 / 58-64 / 91-96 / 123-126 */
function isAsciiPunct(code: number): boolean {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) ||
         (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
}

/** Unicode 标点或符号（CommonMark flanking 用） */
function isPunctuation(ch: string): boolean {
  if (ch.length === 0) return false;
  const code: number = ch.charCodeAt(0);
  if (isAsciiPunct(code)) return true;
  if (code <= 127) return false;                       // 其余 ASCII（字母/数字/控制）非标点
  // 非 ASCII：cased 字母（拉丁/西里尔/希腊等，大小写不同）→ 非标点
  if (ch.toLowerCase() !== ch.toUpperCase()) return false;
  // 无大小写区分的字母（CJK/假名/谚文等，码点 ≥ 0x3040）→ 非标点
  if (code >= 0x3040) return false;
  // 其余非 ASCII（Latin-1 符号、货币 £€、各类 symbol）→ 标点
  return true;
}

/** 强调/加粗后处理：配对 delimiter，把区间包进 Emph/Strong（对标 commonmark.js processEmphasis(null)） */
class EmphasisProcessor {
  out: AstNode[];
  top: Delimiter | null;   // delimiter 栈顶

  constructor(out: AstNode[], top: Delimiter | null) {
    this.out = out;
    this.top = top;
  }

  /** 链表删除（对标 removeDelimiter） */
  removeDelimiter(d: Delimiter): void {
    if (d.previous !== null) { d.previous.next = d.next; }
    if (d.next === null) {
      this.top = d.previous;            // 删的是栈顶
    } else {
      d.next.previous = d.previous;
    }
  }

  /** 跳过 bottom 与 top 之间的 delimiter（对标 removeDelimitersBetween） */
  removeDelimitersBetween(bottom: Delimiter, top: Delimiter): void {
    if (bottom.next !== top) {
      bottom.next = top;
      top.previous = bottom;
    }
  }

  /** 把 out 中 fromNode 与 toNode 之间(不含两端)的节点包进 wrapper，wrapper 放到 fromNode 之后 */
  private wrapBetween(fromNode: AstNode, toNode: AstNode, wrapper: AstNode): void {
    const oi: number = this.out.indexOf(fromNode);
    const ci: number = this.out.indexOf(toNode);
    // 把 (oi, ci) 之间的节点搬进 wrapper（顺序不变）
    for (let k: number = oi + 1; k < ci; k++) {
      wrapper.appendChild(this.out[k]);
    }
    // 用 wrapper 替换 out[oi+1 .. ci-1]
    this.out.splice(oi + 1, ci - oi - 1, wrapper);
  }

  /** 从 out 移除一个节点（按对象身份） */
  private removeNode(n: AstNode): void {
    const idx: number = this.out.indexOf(n);
    if (idx >= 0) { this.out.splice(idx, 1); }
  }

  process(): void {
    // openers_bottom：14 槽数组（0/1 留给引号，不用；_ 用 2..7，* 用 8..13）
    const openersBottom: (Delimiter | null)[] = [];
    for (let n: number = 0; n < 14; n++) { openersBottom.push(null); }

    // 找到栈底之上的第一个 closer：从栈顶回退到底
    let closer: Delimiter | null = this.top;
    while (closer !== null && closer.previous !== null) {
      closer = closer.previous;
    }

    // 前向扫描 closer
    while (closer !== null) {
      const closercc: string = closer.ch;
      if (!closer.canClose) {
        closer = closer.next;
        continue;
      }
      // 找匹配 opener（往回）
      let opener: Delimiter | null = closer.previous;
      let openerFound: boolean = false;
      let obIndex: number;
      if (closercc === '_') {
        obIndex = 2 + (closer.canOpen ? 3 : 0) + (closer.origdelims % 3);
      } else {  // '*'
        obIndex = 8 + (closer.canOpen ? 3 : 0) + (closer.origdelims % 3);
      }
      while (opener !== null && opener !== openersBottom[obIndex]) {
        const oddMatch: boolean =
          (closer.canOpen || opener.canClose) &&
          (closer.origdelims % 3 !== 0) &&
          ((opener.origdelims + closer.origdelims) % 3 === 0);
        if (opener.ch === closer.ch && opener.canOpen && !oddMatch) {
          openerFound = true;
          break;
        }
        opener = opener.previous;
      }
      const oldCloser: Delimiter = closer;

      if (openerFound && opener !== null) {
        // 取实际消耗的 delimiter 数
        const useDelims: number =
          (closer.numdelims >= 2 && opener.numdelims >= 2) ? 2 : 1;
        const openerNode: AstNode | null = opener.node;
        const closerNode: AstNode | null = closer.node;
        opener.numdelims -= useDelims;
        closer.numdelims -= useDelims;
        // 从两端 Text 节点切掉已消耗的 delimiter 字符
        if (openerNode !== null) {
          openerNode.text = openerNode.text.substring(0, openerNode.text.length - useDelims);
        }
        if (closerNode !== null) {
          closerNode.text = closerNode.text.substring(0, closerNode.text.length - useDelims);
        }
        // 建 Emph / Strong，把两端之间节点搬进去
        const emph: AstNode =
          new AstNode(useDelims === 1 ? AstNodeType.Emph : AstNodeType.Strong);
        if (openerNode !== null && closerNode !== null) {
          this.wrapBetween(openerNode, closerNode, emph);
        }
        // 删除 opener 与 closer 之间的所有 delimiter
        this.removeDelimitersBetween(opener, closer);
        // opener 用尽 → 删栈 + 删空 Text 节点
        if (opener.numdelims === 0) {
          if (openerNode !== null) { this.removeNode(openerNode); }
          this.removeDelimiter(opener);
        }
        // closer 用尽 → 删栈 + 删空 Text 节点，closer 前移到 next
        if (closer.numdelims === 0) {
          if (closerNode !== null) { this.removeNode(closerNode); }
          const tempstack: Delimiter | null = closer.next;
          this.removeDelimiter(closer);
          closer = tempstack;
        }
      } else {
        // 没找到 opener：抬高该 closer 类别的搜索下界
        closer = closer.next;
      }

      if (!openerFound) {
        openersBottom[obIndex] = oldCloser.previous;
        if (!oldCloser.canOpen) {
          this.removeDelimiter(oldCloser);
        }
      }
    }
    // out 已就地改好；delimiter 栈丢弃即可
  }
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

  // 反斜杠转义解析 + URI 百分号编码
  let url: string = resolveBackslashEscapes(urlRaw);
  url = normalizeUri(url);

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

function isAsciiLetter(c: number): boolean { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
function isAsciiDigit(c: number): boolean { return c >= 48 && c <= 57; }
function isAsciiAlnum(c: number): boolean { return isAsciiLetter(c) || isAsciiDigit(c); }

// ── 行内原始 HTML 标签解析 ──

/** HTML 空白：空格/Tab/换行/回车/换页 */
function isHtmlWs(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}
function isAttrNameStart(c: number): boolean {
  return isAsciiLetter(c) || c === 95 /*_*/ || c === 58 /*:*/;
}
function isAttrNameChar(c: number): boolean {
  return isAsciiAlnum(c) || c === 95 /*_*/ || c === 58 /*:*/ || c === 46 /*.*/ || c === 45 /*-*/;
}
/** 无引号属性值字符：非 " ' = < > ` 且非空白/控制符（码点 > 0x20） */
function isUnquotedValueChar(c: number): boolean {
  if (c <= 0x20) return false;
  return c !== 34 /*"*/ && c !== 39 /*'*/ && c !== 61 /*=*/ &&
         c !== 60 /*<*/ && c !== 62 /*>*/ && c !== 96 /*`*/;
}
function skipHtmlWs(text: string, p: number): number {
  while (p < text.length && isHtmlWs(text[p])) { p++; }
  return p;
}

/** 行内 HTML 标签：从 start('<') 解析，返回标签后第一个索引；非法返回 -1 */
function tryParseHtmlTag(text: string, start: number): number {
  const len: number = text.length;
  if (start >= len || text[start] !== '<') return -1;
  if (start + 1 >= len) return -1;
  const c1: string = text[start + 1];
  if (c1 === '!') {
    // 注释 <!-- / CDATA <![CDATA[ / 声明 <!Letter
    if (start + 3 < len && text[start + 2] === '-' && text[start + 3] === '-') {
      return parseHtmlComment(text, start);
    }
    if (start + 8 < len && text.substring(start + 2, start + 9) === '[CDATA[') {
      return parseHtmlCdata(text, start);
    }
    return parseHtmlDeclaration(text, start);
  }
  if (c1 === '?') return parseHtmlPI(text, start);
  if (c1 === '/') return parseHtmlCloseTag(text, start);
  return parseHtmlOpenTag(text, start);
}

/** 开标签 <tag attr* /?> */
export function parseHtmlOpenTag(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 1;
  if (p >= len || !isAsciiLetter(text.charCodeAt(p))) return -1;
  p++;
  while (p < len && (isAsciiAlnum(text.charCodeAt(p)) || text[p] === '-')) { p++; }
  // 属性循环
  while (p < len) {
    if (isHtmlWs(text[p])) {
      p = skipHtmlWs(text, p);
      if (p < len && isAttrNameStart(text.charCodeAt(p))) {
        p++;
        while (p < len && isAttrNameChar(text.charCodeAt(p))) { p++; }
        // 可选 = 值
        let vp: number = skipHtmlWs(text, p);
        if (vp < len && text[vp] === '=') {
          vp = skipHtmlWs(text, vp + 1);
          if (vp >= len) return -1;
          const q: string = text[vp];
          if (q === '\'') {
            const e: number = text.indexOf('\'', vp + 1);
            if (e < 0) return -1;
            p = e + 1;
          } else if (q === '"') {
            const e: number = text.indexOf('"', vp + 1);
            if (e < 0) return -1;
            p = e + 1;
          } else {
            const s2: number = vp;
            while (vp < len && isUnquotedValueChar(text.charCodeAt(vp))) { vp++; }
            if (vp === s2) return -1;
            p = vp;
          }
        }
        continue;   // 该属性消费完，继续找下一个
      } else {
        break;      // 空白后非属性名 → 结尾空白，去判 /?>
      }
    } else {
      break;        // 无空白 → 直接判 /?>
    }
  }
  if (p < len && text[p] === '/') { p++; }
  if (p < len && text[p] === '>') return p + 1;
  return -1;
}

/** 闭标签 </tag > （不许属性） */
export function parseHtmlCloseTag(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 2;   // 跳过 </
  if (p >= len || !isAsciiLetter(text.charCodeAt(p))) return -1;
  p++;
  while (p < len && (isAsciiAlnum(text.charCodeAt(p)) || text[p] === '-')) { p++; }
  p = skipHtmlWs(text, p);
  if (p < len && text[p] === '>') return p + 1;
  return -1;
}

/** 注释 */
function parseHtmlComment(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 4;   // 跳过 <!--
  if (p < len && text[p] === '>') return p + 1;                       // <!-->
  if (p + 1 < len && text[p] === '-' && text[p + 1] === '>') return p + 2;  // <!--->
  while (p + 2 < len) {
    if (text[p] === '-' && text[p + 1] === '-' && text[p + 2] === '>') return p + 3;
    p++;
  }
  return -1;
}

/** 处理指令 <? ... ?> */
function parseHtmlPI(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 2;
  while (p + 1 < len) {
    if (text[p] === '?' && text[p + 1] === '>') return p + 2;
    p++;
  }
  return -1;
}

/** 声明 <!Letter ... > */
function parseHtmlDeclaration(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 2;   // 跳过 <!
  if (p >= len || !isAsciiLetter(text.charCodeAt(p))) return -1;
  p++;
  while (p < len && text[p] !== '>') { p++; }
  if (p < len && text[p] === '>') return p + 1;
  return -1;
}

/** CDATA <![CDATA[ ... ]]> */
function parseHtmlCdata(text: string, start: number): number {
  const len: number = text.length;
  let p: number = start + 9;   // 跳过 <![CDATA[
  while (p + 2 < len) {
    if (text[p] === ']' && text[p + 1] === ']' && text[p + 2] === '>') return p + 3;
    p++;
  }
  return -1;
}

/** URI autolink：合法返回 true（inner = <...> 之间的内容） */
function isUriAutolink(inner: string): boolean {
  const n: number = inner.length;
  if (n < 1) return false;
  // scheme：首字母
  if (!isAsciiLetter(inner.charCodeAt(0))) return false;
  let p: number = 1;
  while (p < n) {
    const c: number = inner.charCodeAt(p);
    if (isAsciiAlnum(c) || c === 43 /*+*/ || c === 46 /*.*/ || c === 45 /*-*/) { p++; }
    else { break; }
  }
  // p 处必须是 ':'，scheme 长度 2–32
  if (p >= n || inner[p] !== ':') return false;
  if (p < 2 || p > 32) return false;
  // rest（: 之后）不得含空白 / < / 控制符
  for (let k: number = p + 1; k < n; k++) {
    const c: number = inner.charCodeAt(k);
    if (c <= 0x20 || c === 0x7F) return false;   // 含空格(0x20)、tab、控制符
    if (c === 60 /*<*/) return false;
  }
  return true;
}

/** Email autolink：合法返回 true */
function isEmailAutolink(inner: string): boolean {
  const n: number = inner.length;
  const at: number = inner.indexOf('@');
  if (at <= 0 || at >= n - 1) return false;       // 必须有 @ 且两侧非空
  // local part：1+ 个允许字符（无 @ 之前再次出现 @ 已由 indexOf 第一个 @ 界定，但 local 内不能有 @）
  for (let k: number = 0; k < at; k++) {
    const c: number = inner.charCodeAt(k);
    const ok: boolean = isAsciiAlnum(c) ||
      c === 46 || c === 33 || c === 35 || c === 36 || c === 37 || c === 38 ||  // . ! # $ % &
      c === 39 || c === 42 || c === 43 || c === 47 || c === 61 || c === 63 ||  // ' * + / = ?
      c === 94 || c === 95 || c === 96 || c === 123 || c === 124 || c === 125 || // ^ _ ` { | }
      c === 126 || c === 45;                                                    // ~ -
    if (!ok) return false;
  }
  // domain：label('.'label)*，label = alnum (alnum|-){0,61} 末位 alnum
  const domain: string = inner.substring(at + 1);
  const labels: string[] = domain.split('.');
  for (let li: number = 0; li < labels.length; li++) {
    const lab: string = labels[li];
    const m: number = lab.length;
    if (m < 1 || m > 63) return false;
    if (!isAsciiAlnum(lab.charCodeAt(0))) return false;
    if (!isAsciiAlnum(lab.charCodeAt(m - 1))) return false;
    for (let j: number = 1; j < m - 1; j++) {
      const c: number = lab.charCodeAt(j);
      if (!(isAsciiAlnum(c) || c === 45 /*-*/)) return false;
    }
  }
  return true;
}

/** 是否十进制数字字符 */
function isDecimalDigit(ch: string): boolean {
  const c: number = ch.charCodeAt(0);
  return c >= 48 && c <= 57;                      // 0-9
}

/** 是否十六进制数字字符 */
function isHexDigit(ch: string): boolean {
  const c: number = ch.charCodeAt(0);
  return (c >= 48 && c <= 57) ||                  // 0-9
         (c >= 65 && c <= 70) ||                  // A-F
         (c >= 97 && c <= 102);                   // a-f
}

/** URL 安全标点：; / ? : @ & = + $ , - _ . ! ~ * ' ( ) # */
function isUriSafePunct(c: number): boolean {
  return c === 59 || c === 47 || c === 63 || c === 58 || c === 64 || c === 38 ||
         c === 61 || c === 43 || c === 36 || c === 44 || c === 45 || c === 95 ||
         c === 46 || c === 33 || c === 126 || c === 42 || c === 39 || c === 40 ||
         c === 41 || c === 35;
}

/** 一个字节 → "%XX"（大写十六进制） */
function uriHexByte(b: number): string {
  const HEX: string = '0123456789ABCDEF';
  return '%' + HEX[(b >> 4) & 0xF] + HEX[b & 0xF];
}

/** 码点 → UTF-8 字节的百分号编码 */
function pctEncodeCodePoint(cp: number): string {
  let s: string = '';
  if (cp < 0x80) {
    s += uriHexByte(cp);
  } else if (cp < 0x800) {
    s += uriHexByte(0xC0 | (cp >> 6));
    s += uriHexByte(0x80 | (cp & 0x3F));
  } else if (cp < 0x10000) {
    s += uriHexByte(0xE0 | (cp >> 12));
    s += uriHexByte(0x80 | ((cp >> 6) & 0x3F));
    s += uriHexByte(0x80 | (cp & 0x3F));
  } else {
    s += uriHexByte(0xF0 | (cp >> 18));
    s += uriHexByte(0x80 | ((cp >> 12) & 0x3F));
    s += uriHexByte(0x80 | ((cp >> 6) & 0x3F));
    s += uriHexByte(0x80 | (cp & 0x3F));
  }
  return s;
}

/** CommonMark normalizeURI：保留 alnum/安全标点/已有 %XX，其余按 UTF-8 百分号编码 */
function normalizeUri(sVal: string): string {
  let result: string = '';
  let i: number = 0;
  const n: number = sVal.length;
  while (i < n) {
    const c0: number = sVal.charCodeAt(i);
    if (isAsciiAlnum(c0)) { result += sVal[i]; i++; continue; }
    if (isUriSafePunct(c0)) { result += sVal[i]; i++; continue; }
    // keepEscaped：% + 两位 hex 原样保留
    if (c0 === 37 && i + 2 < n && isHexDigit(sVal[i + 1]) && isHexDigit(sVal[i + 2])) {
      result += sVal.substring(i, i + 3);
      i += 3;
      continue;
    }
    // 百分号编码（含 surrogate pair → astral 码点）
    let cp: number = c0;
    let adv: number = 1;
    if (c0 >= 0xD800 && c0 <= 0xDBFF && i + 1 < n) {
      const c1: number = sVal.charCodeAt(i + 1);
      if (c1 >= 0xDC00 && c1 <= 0xDFFF) {
        cp = 0x10000 + ((c0 - 0xD800) << 10) + (c1 - 0xDC00);
        adv = 2;
      }
    }
    result += pctEncodeCodePoint(cp);
    i += adv;
  }
  return result;
}

/** 命名实体表（惰性构建，name → 解码字符串）。 */
let namedEntityMap: Map<string, string> | null = null;

/** 把 HTML_ENTITY_PACKED ("name=cp,cp;...") 解析进 Map。仅首次调用时构建。 */
function getNamedEntityMap(): Map<string, string> {
  if (namedEntityMap !== null) return namedEntityMap;
  const m: Map<string, string> = new Map<string, string>();
  const entries: string[] = HTML_ENTITY_PACKED.split(';');
  for (let i: number = 0; i < entries.length; i++) {
    const entry: string = entries[i];
    const eq: number = entry.indexOf('=');
    if (eq <= 0) continue;
    const name: string = entry.substring(0, eq);
    const cpsPart: string = entry.substring(eq + 1);
    const cpStrs: string[] = cpsPart.split(',');
    let decoded: string = '';
    for (let j: number = 0; j < cpStrs.length; j++) {
      const cp: number = parseInt(cpStrs[j], 10);
      decoded += String.fromCodePoint(cp);     // 逐个拼，别用 spread（arkts-no-spread）
    }
    m.set(name, decoded);
  }
  namedEntityMap = m;
  return m;
}

/** 查命名实体（name 不含 & 和 ;）。命中返回解码字符串，否则 null。 */
function lookupNamedEntity(name: string): string | null {
  const m: Map<string, string> = getNamedEntityMap();
  const v: string | undefined = m.get(name);
  return v === undefined ? null : v;
}

/** 实体引用解码：命名(表查找) + 数字(十进制/十六进制)。返回 EntityResult 或 null(非实体，留字面) */
function tryParseEntity(text: string, start: number): EntityResult | null {
  const len: number = text.length;
  if (start >= len || text[start] !== '&') return null;

  // ── 数字引用 &#... ──
  if (start + 1 < len && text[start + 1] === '#') {
    let p: number = start + 2;
    let isHex: boolean = false;
    if (p < len && (text[p] === 'x' || text[p] === 'X')) { isHex = true; p++; }
    const digitStart: number = p;
    while (p < len && (isHex ? isHexDigit(text[p]) : isDecimalDigit(text[p]))) { p++; }
    const numDigits: number = p - digitStart;
    // 合法性
    if (numDigits < 1) return null;
    if (isHex && numDigits > 6) return null;
    if (!isHex && numDigits > 7) return null;
    if (p >= len || text[p] !== ';') return null;
    // 解析码点
    const digits: string = text.substring(digitStart, p);
    let cp: number = parseInt(digits, isHex ? 16 : 10);
    if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) {
      cp = 0xFFFD;
    }
    const er: EntityResult = new EntityResult();
    er.value = String.fromCodePoint(cp);
    er.nextIdx = p + 1;                            // 跳过 ';'
    return er;
  }

  // ── 命名实体（HTML5 全表，2125 项）──
  const semi: number = text.indexOf(';', start);
  if (semi < 0 || semi - start - 1 < 1 || semi - start - 1 > 32) return null;   // 名长 1..32
  const name: string = text.substring(start + 1, semi);   // & 与 ; 之间
  const decoded: string | null = lookupNamedEntity(name);
  if (decoded === null) return null;
  const er2: EntityResult = new EntityResult();
  er2.value = decoded;
  er2.nextIdx = semi + 1;
  return er2;
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
    url = normalizeUri(angleRes.url);
    pos = angleRes.nextIdx;
  } else {
    const bareRes: DestResult | null = parseBareDest(line, pos);
    if (!bareRes) return null;
    // parseBareDest already resolves backslash escapes; destination must be non-empty
    const resolved: string = bareRes.url;
    if (resolved === '') return null;
    url = normalizeUri(resolved);
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

// ── 图片 alt 纯文本化（CommonMark 6.4）──

/** 取节点子树的「纯文本」（用于图片 alt）：
 *  Text/Code/HtmlInline → 字面 text；Image → 其 attrs.alt（已是纯文本）；
 *  SoftBreak/HardBreak → '\n'；其余容器节点(Emph/Strong/Strike/Link…) → 递归子节点。 */
function plainTextOf(node: AstNode): string {
  let out: string = '';
  for (let k: number = 0; k < node.children.length; k++) {
    const c: AstNode = node.children[k];
    const t: AstNodeType = c.type;
    if (t === AstNodeType.Text || t === AstNodeType.Code || t === AstNodeType.HtmlInline) {
      out += c.text;
    } else if (t === AstNodeType.Image) {
      out += c.attrs.alt;
    } else if (t === AstNodeType.SoftBreak || t === AstNodeType.HardBreak) {
      out += '\n';
    } else {
      out += plainTextOf(c);   // Emph/Strong/Strike/Link 等容器递归
    }
  }
  return out;
}

/** 把括号原始文本解析为内联、再抽纯文本，作为图片 alt。 */
function extractAltText(rawText: string): string {
  const tmp: AstNode = new AstNode(AstNodeType.Paragraph);
  parseInlines(rawText, tmp);
  return plainTextOf(tmp);
}
