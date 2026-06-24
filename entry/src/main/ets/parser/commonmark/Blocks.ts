/**
 * Blocks — 块级解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/blocks.ts。
 * 处理 Markdown 块级结构：标题、代码块、引用、列表、表格、分割线、段落。
 * 所有函数为纯函数，通过 ParseState 访问输入流。
 */

import { AstNode, AstNodeType } from './Node';
import { ParseState } from './ParseState';
import { parseInlines, parseLinkRefDefLine, parseHtmlOpenTag, parseHtmlCloseTag, unescapeString } from './Inlines';
import { tryParseGfmBlock } from './Gfm';

/**
 * 解析从当前位置到文档末尾的所有块，添加到 parent 的子节点。
 * 这是块级解析的主循环。
 */
export function parseBlocks(state: ParseState, parent: AstNode): void {
  while (!state.isEnd()) {
    state.skipBlankLines();
    if (state.isEnd()) break;

    const node: AstNode | null = tryParseBlock(state);
    if (node) {
      parent.appendChild(node);
    } else {
      // 降级为段落
      const para: AstNode = parseParagraph(state);
      if (para.children.length > 0) {
        parent.appendChild(para);
      }
    }
  }
}

/** 尝试解析当前位置的块级元素，失败返回 null */
export function tryParseBlock(state: ParseState): AstNode | null {
  const line: string = state.currentLine();

  // 代码块 (fenced)
  if (isCodeFenceStart(line)) {
    return parseCodeBlock(state);
  }
  // ATX 标题
  if (isAtxHeadingStart(line)) {
    return parseHeading(state);
  }
  // 分割线（优先级高于 Setext 标题，因为 --- 可能是分割线）
  if (isThematicBreak(line)) {
    return parseThematicBreak(state);
  }
  // 缩进代码块 (≥4 列缩进，tab 制表位=4)
  if (countIndentColumns(line) >= 4) {
    // 只在不处在其他块内部时解析
    return parseIndentedCodeBlock(state);
  }
  // 块引用
  if (isBlockQuoteStart(line)) {
    return parseBlockQuote(state);
  }
  // HTML 块
  if (isHtmlBlockStart(line)) {
    return parseHtmlBlock(state);
  }
  // 无序列表
  if (isBulletListMarker(line)) {
    return parseList(state, false);
  }
  // 有序列表
  if (isOrderedListMarker(line)) {
    return parseList(state, true);
  }

  // GFM 扩展（表格等）
  const gfm: AstNode | null = tryParseGfmBlock(state);
  if (gfm) return gfm;

  // 链接引用定义行 [label]: dest "title" — 消费但不渲染
  if (parseLinkRefDefLine(line) !== null) {
    state.nextLine(); // 必须推进，否则死循环
    // 返回空段落节点（renderParagraph 对空内容返回 ''，定义行不产生输出）
    return new AstNode(AstNodeType.Paragraph);
  }

  return null;
}

// ── 具体块解析 ──

/** 围栏开始信息（具名 class，禁匿名对象字面量） */
class FenceInfo {
  fenceChar: string = '';
  fenceLen: number = 0;
  indent: number = 0;
  info: string = '';
}

/** 解析开围栏行；不是合法围栏返回 null。
 *  规则：≤3 前导空格 + ≥3 同字符(` 或 ~) run；backtick 围栏 info 禁含 ` 。 */
function parseCodeFenceOpen(line: string): FenceInfo | null {
  let i: number = 0;
  while (i < line.length && line[i] === ' ' && i < 4) i++;
  const indent: number = i;
  if (indent >= 4) return null;            // ≥4 空格属缩进代码块，非围栏
  if (i >= line.length) return null;
  const ch: string = line[i];
  if (ch !== '`' && ch !== '~') return null;
  let runLen: number = 0;
  while (i < line.length && line[i] === ch) { runLen++; i++; }
  if (runLen < 3) return null;
  const rest: string = line.substring(i);
  if (ch === '`' && rest.indexOf('`') >= 0) return null;  // backtick 围栏 info 禁含 backtick
  const fi: FenceInfo = new FenceInfo();
  fi.fenceChar = ch;
  fi.fenceLen = runLen;
  fi.indent = indent;
  fi.info = unescapeString(rest.trim());
  return fi;
}

/** 入口用：是否是合法围栏开始 */
function isCodeFenceStart(line: string): boolean {
  return parseCodeFenceOpen(line) !== null;
}

/** 是否是匹配的闭围栏：≤3 空格 + 同 fenceChar run ≥ openLen + 其后仅空白 */
function isClosingFence(line: string, fenceChar: string, openLen: number): boolean {
  let i: number = 0;
  while (i < line.length && line[i] === ' ' && i < 4) i++;
  if (i >= 4) return false;                // ≥4 空格 → 内容，不是闭合
  let runLen: number = 0;
  while (i < line.length && line[i] === fenceChar) { runLen++; i++; }
  if (runLen < openLen) return false;
  return isAllWhitespaceFrom(line, i);     // 复用已有 helper（第 675 行）
}

/** 内容去缩进：去掉至多 n 个前导空格 */
function stripFenceIndent(line: string, n: number): string {
  let i: number = 0;
  while (i < line.length && i < n && line[i] === ' ') i++;
  return line.substring(i);
}

/** 围栏代码块 ```lang ... ``` */
export function parseCodeBlock(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.CodeBlock);
  const fi: FenceInfo | null = parseCodeFenceOpen(state.currentLine());
  state.nextLine();
  // fi 入口已保证非 null；防御性处理
  const fenceChar: string = fi !== null ? fi.fenceChar : '`';
  const fenceLen: number = fi !== null ? fi.fenceLen : 3;
  const indent: number = fi !== null ? fi.indent : 0;
  node.attrs.info = fi !== null ? fi.info : '';

  let code: string = '';
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (isClosingFence(line, fenceChar, fenceLen)) {
      state.nextLine();
      break;
    }
    code += stripFenceIndent(line, indent) + '\n';
    state.nextLine();
  }
  const textNode: AstNode = new AstNode(AstNodeType.Text);
  textNode.text = code;
  node.appendChild(textNode);
  return node;
}

/** ATX 开标记解析结果（具名 class，禁匿名对象字面量） */
class AtxOpen {
  level: number = 0;
  contentStart: number = 0;
}

/** 解析 ATX 开标记；不是合法 ATX 标题返回 null。
 *  规则：≤3 前导空格 + 1-6 个 # + 其后跟 空格/Tab/行尾。 */
function parseAtxOpen(line: string): AtxOpen | null {
  let i: number = 0;
  while (i < line.length && line[i] === ' ' && i < 4) i++;
  if (i >= 4) return null;                       // ≥4 空格 → 缩进代码，非标题
  const start: number = i;
  while (i < line.length && line[i] === '#') i++;
  const level: number = i - start;
  if (level < 1 || level > 6) return null;        // 0 个或 7+ 个 → 非标题
  if (i < line.length) {                          // run 后必须空格/Tab（行尾 i===length 也合法）
    const c: string = line[i];
    if (c !== ' ' && c !== '\t') return null;
  }
  const ah: AtxOpen = new AtxOpen();
  ah.level = level;
  ah.contentStart = i;
  return ah;
}

/** 入口用：是否合法 ATX 标题开始 */
function isAtxHeadingStart(line: string): boolean {
  return parseAtxOpen(line) !== null;
}

/** ATX 标题 # Heading */
export function parseHeading(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.Heading);
  const line: string = state.currentLine();
  state.nextLine();
  const ah: AtxOpen | null = parseAtxOpen(line);
  // 入口已保证非 null；防御性处理
  const level: number = ah !== null ? ah.level : 1;
  const cStart: number = ah !== null ? ah.contentStart : 1;
  node.attrs.level = level;

  // 内容：开标记之后，首尾去空格/Tab
  let s: string = line.substring(cStart);
  // 去首部空格/Tab
  let a: number = 0;
  while (a < s.length && (s[a] === ' ' || s[a] === '\t')) a++;
  // 去尾部空格/Tab
  let e: number = s.length;
  while (e > a && (s[e - 1] === ' ' || s[e - 1] === '\t')) e--;
  s = s.substring(a, e);

  // 闭合序列：尾部 # run，仅当其前是 空格/Tab 或 run 即整个内容 才剥除
  let he: number = s.length;                         // run 末端（已无尾随空白）
  let h: number = he;
  while (h > 0 && s[h - 1] === '#') h--;             // [h, he) 为尾部 # run
  if (h < he && (h === 0 || s[h - 1] === ' ' || s[h - 1] === '\t')) {
    // 是闭合序列 → 剥除 run + 其前的空格/Tab
    let k: number = h;
    while (k > 0 && (s[k - 1] === ' ' || s[k - 1] === '\t')) k--;
    s = s.substring(0, k);
  }

  parseInlines(s, node);
  return node;
}

/** 分割线 --- / *** / ___ */
export function parseThematicBreak(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.ThematicBreak);
  state.nextLine();
  return node;
}

// ── 块引用 helpers（lazy paragraph continuation）──

/** 引用块标记剥离：跳 ≤3 前导空格 → '>' → 一个可选空格/制表。返回剥后内容；非引用行返回 null。 */
function blockQuoteMarkerStrip(line: string): string | null {
  let i: number = 0;
  let col: number = 0;
  while (i < line.length && col < 4) {
    const ch: string = line[i];
    if (ch === ' ') { col += 1; i += 1; }
    else if (ch === '\t') { col += 4 - (col % 4); i += 1; }
    else break;
  }
  if (col >= 4) return null;                       // 缩进≥4 → 非引用块
  if (i >= line.length || line[i] !== '>') return null;
  i += 1;                                           // 消费 '>'
  if (i < line.length && (line[i] === ' ' || line[i] === '\t')) { i += 1; }   // 一个可选空格/制表
  return line.substring(i);
}

/** 引用块起始（容忍 ≤3 前导空格）。 */
function isBlockQuoteStart(line: string): boolean {
  return blockQuoteMarkerStrip(line) !== null;
}

/** 收进 rest 后，引用块尾部是否有「开着的段落」（决定后续非 > 行能否懒续）。
 *  blank / ATX 标题(#) / 围栏(```/~~~) / 分割线 → false（无开段落或不可懒续）；
 *  其余（普通段落文本、嵌套 > 行、列表项等）→ true（乐观；递归会正确收口）。 */
function setsParaOpen(rest: string): boolean {
  if (isBlankLine(rest)) return false;
  if (rest.startsWith('#')) return false;
  if (isCodeFenceStart(rest)) return false;
  if (isThematicBreak(rest)) return false;
  return true;
}

/** 非 > 行能否作为段落懒续行（= parseParagraph 不会被它打断）。
 *  缩进≥4 的行本批保守不收（Ex238 缩进列表懒续行留后续，避免动 parseParagraph 列表打断规则）。 */
function isLazyContinuable(line: string): boolean {
  if (isBlankLine(line)) return false;
  if (countIndentColumns(line) >= 4) return false;     // 本批不处理缩进懒续行（Ex238 延后）
  if (line.startsWith('#')) return false;              // ATX 标题打断段落
  if (isCodeFenceStart(line)) return false;              // 围栏打断
  if (isThematicBreak(line)) return false;             // 分割线打断
  if (line.startsWith('>')) return false;              // > 行另行处理
  if (isHtmlBlockInterrupt(line)) return false;        // HTML 块 type1-6 打断
  if (isNonEmptyListMarker(line)) return false;  // non-empty list markers interrupt lazy continuation (empty markers don't)
  return true;
}

/** 块引用 > content（含懒段落续行） */
export function parseBlockQuote(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.BlockQuote);
  let content: string = '';
  let paraOpen: boolean = false;
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    const rest: string | null = blockQuoteMarkerStrip(line);
    if (rest !== null) {
      // > 行：纯空白 rest 归一为空行（Ex241）
      const piece: string = isBlankLine(rest) ? '' : rest;
      content += piece + '\n';
      paraOpen = setsParaOpen(rest);
      state.nextLine();
    } else {
      // 非 > 行：懒续行候选
      if (paraOpen && isLazyContinuable(line)) {
        content += line + '\n';     // 原样收（内层 parseParagraph 会 trimStart）
        // paraOpen 保持 true
        state.nextLine();
      } else {
        break;                       // 引用块结束
      }
    }
  }
  const innerState: ParseState = new ParseState();
  innerState.reset(content);
  parseBlocks(innerState, node);
  return node;
}

// ── 列表 marker 解析（具名 class，禁匿名对象字面量）──

/** 无序列表 marker 解析结果 */
class BulletMarker {
  ch: string = '';          // marker 字符：- * +
  contentCol: number = 0;   // 内容起始列 W（marker + 空白之后的列位置）
}

/** 有序列表 marker 解析结果 */
class OrderedMarker {
  num: number = 0;          // 编号数值
  delim: string = '';       // 分隔符：. 或 )
  contentCol: number = 0;   // 内容起始列 W（数字 + 分隔符 + 空白之后的列位置）
}

/**
 * 解析无序列表 marker：行首 [-*+] + ≥1 空白
 * 返回 BulletMarker 或 null。contentCol 按空格数计算真实内容缩进列 W。
 * 规则：marker 后 s 个空白列（tab 展开），1≤s≤4 → W=1+s，s≥5 或 s=0 → W=2
 */
function parseBulletMarker(line: string): BulletMarker | null {
  if (line.length < 1) return null;
  const ch: string = line[0];
  if (ch !== '-' && ch !== '*' && ch !== '+') return null;

  // Empty marker branch: marker char followed by EOL or only whitespace
  // CommonMark 5.2 — empty list items are valid (e.g. "-" / "-   ")
  if (line.length === 1 || isAllWhitespaceFrom(line, 1)) {
    const result: BulletMarker = new BulletMarker();
    result.ch = ch;
    result.contentCol = 2; // marker width (1) + 1
    return result;
  }

  // Non-empty marker: must have ≥1 whitespace after marker char
  if (line[1] !== ' ' && line[1] !== '\t') return null;

  // 计 marker 后空白列数（从位置 1 开始，当前处于列 1）
  const wsEndCol: number = countWhitespaceFrom(line, 1, 1);
  const wsCols: number = wsEndCol - 1; // 扣除 marker 字符占的 1 列

  const result: BulletMarker = new BulletMarker();
  result.ch = ch;
  // W 计算：1≤s≤4 → W=1+s，s≥5 → W=2
  if (wsCols >= 1 && wsCols <= 4) {
    result.contentCol = 1 + wsCols; // marker 字符(1列) + 空白列
  } else {
    // s ≥ 5 或 s === 0（不应出现）
    result.contentCol = 2;
  }
  return result;
}

/**
 * 解析有序列表 marker：行首 1-9 位数字 + (. 或 )) + ≥1 空白
 * 返回 OrderedMarker 或 null。contentCol 按空格数计算真实内容缩进列 W。
 */
function parseOrderedMarker(line: string): OrderedMarker | null {
  let i: number = 0;
  while (i < line.length && i < 9 && line[i] >= '0' && line[i] <= '9') {
    i++;
  }
  if (i === 0) return null; // 无数字
  if (i >= line.length) return null; // 只有数字，无分隔符
  const delim: string = line[i];
  if (delim !== '.' && delim !== ')') return null;

  // marker 文本结束位置：(i+1) 是分隔符之后第一个字符位置
  // marker 文本宽度 = i + 1 列（数字 + 分隔符各 1 列）
  const markerEndIdx: number = i + 1;
  const markerWidth: number = markerEndIdx; // 数字和分隔符都是单宽字符

  // Empty marker branch: delimiter followed by EOL or only whitespace
  // CommonMark 5.2 — empty list items are valid (e.g. "2." / "1)   ")
  if (markerEndIdx >= line.length || isAllWhitespaceFrom(line, markerEndIdx)) {
    const result: OrderedMarker = new OrderedMarker();
    result.num = parseInt(line.substring(0, i));
    result.delim = delim;
    result.contentCol = markerWidth + 1; // marker width + 1
    return result;
  }

  // Non-empty marker: must have ≥1 whitespace after delimiter
  if (line[i + 1] !== ' ' && line[i + 1] !== '\t') return null;

  // 计 marker 后空白列数（从 markerEndIdx 开始，当前处于列 markerWidth）
  const wsEndCol: number = countWhitespaceFrom(line, markerEndIdx, markerWidth);
  const wsCols: number = wsEndCol - markerWidth;

  const result: OrderedMarker = new OrderedMarker();
  result.num = parseInt(line.substring(0, i));
  result.delim = delim;
  // W 计算：1≤s≤4 → W=markerWidth+s，s≥5 → W=markerWidth+1
  if (wsCols >= 1 && wsCols <= 4) {
    result.contentCol = markerWidth + wsCols;
  } else {
    result.contentCol = markerWidth + 1;
  }
  return result;
}

/** 列表（有序或无序）
 *
 * 按 CommonMark 规范重写内容收集：
 * - A) marker 后按空格数计算真实内容缩进列 W
 * - B) 收集整项内容（首行+续行），含空行/懒续行
 * - C) tight/loose 判定并同步到 list + 每个 item
 * - 唯一内容路径：itemLines.join('\n') 走 parseBlocks（不单独 parseInlines）
 */
export function parseList(state: ParseState, ordered: boolean): AstNode {
  const listType: AstNodeType = ordered
    ? AstNodeType.OrderedList : AstNodeType.BulletList;
  const list: AstNode = new AstNode(listType);
  list.attrs.ordered = ordered;

  // 记录首项 marker 身份，用于后续边界检测
  let bulletCh: string = '';
  let orderedDelim: string = '';
  const firstLine: string = state.currentLine();
  if (ordered) {
    const fm: OrderedMarker | null = parseOrderedMarker(firstLine);
    if (fm) {
      orderedDelim = fm.delim;
      list.attrs.start = fm.num;
    }
  } else {
    const fm: BulletMarker | null = parseBulletMarker(firstLine);
    if (fm) {
      bulletCh = fm.ch;
    }
  }

  let listIsLoose: boolean = false;

  while (!state.isEnd()) {
    const line: string = state.currentLine();

    // 解析当前行 marker，获取 W 并检查列表身份一致性
    let contentCol: number = 0;
    if (ordered) {
      const m: OrderedMarker | null = parseOrderedMarker(line);
      if (!m) break;
      if (m.delim !== orderedDelim) break;
      contentCol = m.contentCol;
    } else {
      const m: BulletMarker | null = parseBulletMarker(line);
      if (!m) break;
      if (m.ch !== bulletCh) break;
      contentCol = m.contentCol;
    }

    const item: AstNode = new AstNode(AstNodeType.ListItem);

    // B1) 首行内容 = line 从列 W 开始（不 trimStart，保留相对缩进）
    const firstContent: string = substringByColumn(line, contentCol);
    state.nextLine();

    // B2) 收集后续行进 itemLines（保持顺序）
    const itemLines: string[] = [];
    let itemHadBlank: boolean = false;
    const isEmptyContentMarker: boolean = isBlankLine(firstContent);

    if (isEmptyContentMarker) {
      // Empty content marker: CommonMark "at most one starting blank line" rule
      if (state.isEnd() || isBlankLine(state.currentLine())) {
        // Empty item: marker line has no content AND next line is blank/EOF
        // → produce empty ListItem, do NOT consume the blank line
        // itemLines stays empty → parseBlocks produces no children → <li></li>
        list.appendChild(item);
        continue;
      }
      // Next line is non-blank: use it as content start
      // itemLines stays empty (don't push blank firstContent → avoids false loose trigger)
    } else {
      itemLines.push(firstContent);
    }

    while (!state.isEnd()) {
      const next: string = state.currentLine();

      // 空行 → 记空行并标记
      if (next === '') {
        itemLines.push('');
        itemHadBlank = true;
        state.nextLine();
        continue;
      }

      // 行缩进 ≥ W → 去掉前 W 列（tab 展开）后 push
      const indentCols: number = countIndentColumns(next);
      if (indentCols >= contentCol) {
        itemLines.push(stripIndentCols(next, contentCol));
        state.nextLine();
        continue;
      }

      // 缩进 < W 且非空：新列表 marker → 本项结束（不消费）
      if (isBulletListMarker(next) || isOrderedListMarker(next)) {
        break;
      }

      // 非列表块起始 → 本项结束（不消费）
      if (isNonListBlockStart(next)) {
        break;
      }

      // 已遇空行后再有缩进不足的行 → 非懒续行，本项结束
      if (itemHadBlank) {
        break;
      }

      // 懒续行 → push 原行（不去缩进）；继续
      itemLines.push(next);
      state.nextLine();
    }

    // C) tight/loose 判定 — 项间空行
    if (itemHadBlank && !state.isEnd()) {
      const nextLine: string = state.currentLine();
      if (isBulletListMarker(nextLine) || isOrderedListMarker(nextLine)) {
        listIsLoose = true;
      }
    }

    // B3) 去掉尾部空行
    while (itemLines.length > 0 && itemLines[itemLines.length - 1] === '') {
      itemLines.pop();
    }

    // C) tight/loose — 项内非尾部空行
    for (let j: number = 0; j < itemLines.length; j++) {
      if (itemLines[j] === '') {
        listIsLoose = true;
        break;
      }
    }

    // B4) 任务列表检测（GFM）：作用于 itemLines[0]（首行内容）
    if (itemLines.length > 0) {
      const fl: string = itemLines[0];
      if (fl.startsWith('[ ] ')) {
        item.attrs.checked = false;
        itemLines[0] = fl.substring(4);
      } else if (fl.startsWith('[x] ') || fl.startsWith('[X] ')) {
        item.attrs.checked = true;
        itemLines[0] = fl.substring(4);
      }
    }

    // B5) 唯一内容路径：itemLines.join('\n') → parseBlocks
    // 删掉原先单独的 parseInlines(itemText) 追加 —— Ex254 顺序 bug 根因
    const content: string = itemLines.join('\n');
    const innerState: ParseState = new ParseState();
    innerState.reset(content);
    parseBlocks(innerState, item);

    list.appendChild(item);
  }

  // C) 设 tight 并同步到每个 item（渲染器拿不到父 list 上下文）
  list.attrs.tight = !listIsLoose;
  for (let i: number = 0; i < list.children.length; i++) {
    list.children[i].attrs.tight = list.attrs.tight;
  }

  return list;
}

/** 段落 */
export function parseParagraph(state: ParseState): AstNode {
  const paraNode: AstNode = new AstNode(AstNodeType.Paragraph);
  let text: string = '';
  let lastLineWasEmpty: boolean = false;

  while (!state.isEnd()) {
    const line: string = state.currentLine();
    // 空行 → 段落结束
    if (line === '') break;
    // 块级标记 → 段落结束
    if (isAtxHeadingStart(line) || isCodeFenceStart(line)) break;
    if (line.startsWith('>')) break;
    if (isNonEmptyListMarker(line)) break;  // empty list markers don't interrupt paragraphs (Ex367)
    if (isThematicBreak(line)) break;
    // HTML 块（type 7 不打断段落）
    if (isHtmlBlockInterrupt(line)) break;

    text += (text !== '' ? '\n' : '') + line.trimStart();
    state.nextLine();

    // Setext 标题前瞻：下一行是 === 或 ---
    if (!state.isEnd()) {
      const nextLine: string = state.currentLine();
      const setextLevel: number = setextUnderlineType(nextLine);
      if (setextLevel > 0) {
        const heading: AstNode = new AstNode(AstNodeType.Heading);
        heading.attrs.level = setextLevel;
        parseInlines(stripTrailingSpacesTabs(text), heading);   // 去标题内容尾随空白
        state.nextLine(); // 消费下划线行
        return heading;   // 直接返回，不返回段落
      }
    }
  }
  parseInlines(text, paraNode);
  return paraNode;
}

// ── 新增块解析 ──

/** 计算行首缩进的列数（tab 制表位 = 4，空格 +1 列，tab 跳到下一个 4 的倍数列） */
function countIndentColumns(line: string): number {
  let col: number = 0;
  for (let i: number = 0; i < line.length; i++) {
    const ch: string = line[i];
    if (ch === ' ') {
      col += 1;
    } else if (ch === '\t') {
      col += 4 - (col % 4);
    } else {
      break;
    }
  }
  return col;
}

/** 计空白列：从 line[startIdx]（位于 startCol 列）开始数空白到达的列号 */
function countWhitespaceFrom(line: string, startIdx: number, startCol: number): number {
  let col: number = startCol;
  let i: number = startIdx;
  while (i < line.length) {
    const ch: string = line[i];
    if (ch === ' ') {
      col += 1;
      i += 1;
    } else if (ch === '\t') {
      col += 4 - (col % 4);
      i += 1;
    } else {
      break;
    }
  }
  return col;
}

/** 从 line 的第 colW 列开始取子串（跳过 colW 列，含非空白字符） */
function substringByColumn(line: string, colW: number): string {
  let col: number = 0;
  let pos: number = 0;
  while (pos < line.length && col < colW) {
    const ch: string = line[pos];
    if (ch === ' ') {
      col += 1;
      pos += 1;
    } else if (ch === '\t') {
      col += 4 - (col % 4);
      pos += 1;
    } else {
      col += 1;
      pos += 1;
    }
  }
  return line.substring(pos);
}

/** 剥掉行首最多 colW 列空白（遇到非空白字符立即停止），返回剩余内容 */
function stripIndentCols(line: string, colW: number): string {
  let col: number = 0;
  let pos: number = 0;
  while (pos < line.length && col < colW) {
    const ch: string = line[pos];
    if (ch === ' ') {
      col += 1;
      pos += 1;
    } else if (ch === '\t') {
      col += 4 - (col % 4);
      pos += 1;
    } else {
      break;
    }
  }
  return line.substring(pos);
}

/** 检查行是否是非列表的块起始标记（用于懒续行边界判定） */
function isNonListBlockStart(line: string): boolean {
  if (line.startsWith('#')) return true;
  if (line.startsWith('>')) return true;
  if (line.startsWith('```') || line.startsWith('~~~')) return true;
  if (isThematicBreak(line)) return true;
  if (isHtmlBlockInterrupt(line)) return true;
  return false;
}

/** 剥掉行首前 4 列缩进（按 tab 展开计算），返回剩余内容 */
function stripIndent(line: string): string {
  let col: number = 0;
  let pos: number = 0;
  while (pos < line.length) {
    const ch: string = line[pos];
    if (ch === ' ') {
      col += 1;
      pos += 1;
    } else if (ch === '\t') {
      col += 4 - (col % 4);
      pos += 1;
    } else {
      break;
    }
    if (col >= 4) {
      return line.substring(pos);
    }
  }
  return line;
}

/** 缩进代码块（每行 ≥4 列缩进） */
function parseIndentedCodeBlock(state: ParseState): AstNode | null {
  const saved: number = state.save();
  let code: string = '';
  let hasContent: boolean = false;

  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (line === '') {
      // 前瞻：连续空白行之后是否还有缩进≥4的行？若无则尾随空白恢复并结束
      const blankSaved: number = state.save();
      let blankCount: number = 0;
      while (!state.isEnd() && state.currentLine() === '') {
        state.nextLine();
        blankCount++;
      }
      if (!state.isEnd()) {
        const nextLine: string = state.currentLine();
        if (countIndentColumns(nextLine) >= 4) {
          // 后续还有缩进代码行 → 空白是代码块内部空行
          for (let b: number = 0; b < blankCount; b++) {
            code += '\n';
          }
          continue;
        }
      }
      // 尾随空白（或EOF）→ 不是代码内容，恢复并结束
      state.restore(blankSaved);
      break;
    }
    // 检查是否缩进 ≥4 列
    if (countIndentColumns(line) >= 4) {
      code += stripIndent(line) + '\n';
      hasContent = true;
      state.nextLine();
    } else {
      break;
    }
  }

  if (!hasContent) {
    state.restore(saved);
    return null;
  }

  const node: AstNode = new AstNode(AstNodeType.CodeBlock);
  const textNode: AstNode = new AstNode(AstNodeType.Text);
  textNode.text = code;
  node.appendChild(textNode);
  return node;
}

// ── HTML 块解析（CommonMark 4.6 七型分类）──

/** 常量：Type 6 HTML 块标签名单 */
const HTML_BLOCK_TYPE6_NAMES: string[] = ['address', 'article', 'aside', 'base', 'basefont',
  'blockquote', 'body', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'iframe', 'legend', 'li',
  'link', 'main', 'menu', 'menuitem', 'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param',
  'section', 'search', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr',
  'track', 'ul'];

/** 字符 helper（charCode，无正则） */
function isAsciiLetterCh(cc: number): boolean { return (cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122); }
function isAsciiAlnumCh(cc: number): boolean { return isAsciiLetterCh(cc) || (cc >= 48 && cc <= 57); }

function isAllWhitespaceFrom(s: string, from: number): boolean {
  for (let k: number = from; k < s.length; k++) {
    const c: string = s[k];
    if (c !== ' ' && c !== '\t') return false;
  }
  return true;
}

function isBlankLine(line: string): boolean {
  for (let k: number = 0; k < line.length; k++) {
    const c: string = line[k];
    if (c !== ' ' && c !== '\t') return false;
  }
  return true;
}

function isType6Name(name: string): boolean {
  return HTML_BLOCK_TYPE6_NAMES.indexOf(name) >= 0;
}

/** 提取 < 或 </ 后的字母数字 tagname，匹配 type1 名单或 type6 名单。
 *  isType6=false → 查 type1 名单(script/pre/textarea/style)，终止符不含 '/'；
 *  isType6=true  → 查 type6 名单，终止符含 '/'。
 *  命中返回 1 或 6，否则 0。 */
function matchHtmlTagNameType(s: string, isType6: boolean): number {
  let p: number = 1;
  if (isType6 && s.length > 1 && s[1] === '/') {
    p = 2;
  }
  if (p >= s.length || !isAsciiLetterCh(s.charCodeAt(p))) return 0;
  const nameStart: number = p;
  p += 1;
  while (p < s.length && isAsciiAlnumCh(s.charCodeAt(p))) {
    p += 1;
  }
  const name: string = s.substring(nameStart, p).toLowerCase();
  const term: string = p < s.length ? s[p] : '';
  const isWs: boolean = term === '' || term === ' ' || term === '\t';
  if (!isType6) {
    if (name === 'script' || name === 'pre' || name === 'textarea' || name === 'style') {
      if (isWs || term === '>') return 1;
    }
    return 0;
  } else {
    if (isType6Name(name)) {
      if (isWs || term === '>' || term === '/') return 6;
    }
    return 0;
  }
}

/** HTML 块类型检测：返回 0(非) 或 1-7。s 用「去前导(<4列)空白后」的子串匹配。 */
function htmlBlockStartType(line: string): number {
  let i: number = 0;
  let col: number = 0;
  while (i < line.length && col < 4) {
    const ch: string = line[i];
    if (ch === ' ') { col += 1; i += 1; }
    else if (ch === '\t') { col += 4 - (col % 4); i += 1; }
    else break;
  }
  if (col >= 4) return 0;
  const s: string = line.substring(i);
  if (s.length === 0 || s[0] !== '<') return 0;

  // type 1: < (script|pre|textarea|style) 终止符(空白|>|EOL，不含/)
  const t1: number = matchHtmlTagNameType(s, false);
  if (t1 === 1) return 1;
  // type 2: <!--
  if (s.length >= 4 && s[1] === '!' && s[2] === '-' && s[3] === '-') return 2;
  // type 3: <?
  if (s.length >= 2 && s[1] === '?') return 3;
  // type 5: <![CDATA[ (先于 type4 测，避免歧义)
  if (s.length >= 9 && s.substring(0, 9) === '<![CDATA[') return 5;
  // type 4: <! + ASCII 字母
  if (s.length >= 3 && s[1] === '!' && isAsciiLetterCh(s.charCodeAt(2))) return 4;
  // type 6: </? 名字∈名单 终止符(空白|>|/|EOL)
  const t6: number = matchHtmlTagNameType(s, true);
  if (t6 === 6) return 6;
  // type 7: 完整开/闭标签 + 仅空白到行尾
  let e: number = -1;
  if (s.length >= 2 && s[1] === '/') {
    e = parseHtmlCloseTag(s, 0);
  } else {
    e = parseHtmlOpenTag(s, 0);
  }
  if (e >= 0 && isAllWhitespaceFrom(s, e)) return 7;
  return 0;
}

/** 任意 HTML 块起始（type 1-7）——用于 tryParseBlock 的新块入口 */
function isHtmlBlockStart(line: string): boolean {
  return htmlBlockStartType(line) > 0;
}

/** 可打断段落/懒续行的 HTML 块（type 1-6；type 7 不能打断段落） */
function isHtmlBlockInterrupt(line: string): boolean {
  const t: number = htmlBlockStartType(line);
  return t >= 1 && t <= 6;
}

/** 结束标记判定 */
function htmlBlockCloseMatch(line: string, blockType: number): boolean {
  if (blockType === 1) {
    const lc: string = line.toLowerCase();
    return lc.indexOf('</script>') >= 0 || lc.indexOf('</pre>') >= 0 ||
           lc.indexOf('</textarea>') >= 0 || lc.indexOf('</style>') >= 0;
  }
  if (blockType === 2) return line.indexOf('-->') >= 0;
  if (blockType === 3) return line.indexOf('?>') >= 0;
  if (blockType === 4) return line.indexOf('>') >= 0;
  if (blockType === 5) return line.indexOf(']]>') >= 0;
  return false;
}

/** 解析 HTML 块 */
function parseHtmlBlock(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.HtmlBlock);
  const firstLine: string = state.currentLine();
  const blockType: number = htmlBlockStartType(firstLine);
  const lines: string[] = [];
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (blockType >= 6) {
      // type 6 / 7：空行结束（空行不计入、不消费）
      if (isBlankLine(line)) break;
      lines.push(line);
      state.nextLine();
    } else {
      // type 1-5：先收进，再判结束标记（首行也判）；中间空行也收
      lines.push(line);
      state.nextLine();
      if (htmlBlockCloseMatch(line, blockType)) break;
    }
  }
  const textNode: AstNode = new AstNode(AstNodeType.Text);
  textNode.text = lines.join('\n');
  node.appendChild(textNode);
  return node;
}

/** 去掉字符串尾随的空格/制表（不动行内、不动 \n）。 */
function stripTrailingSpacesTabs(s: string): string {
  let e: number = s.length;
  while (e > 0) {
    const c: string = s[e - 1];
    if (c !== ' ' && c !== '\t') break;
    e -= 1;
  }
  return s.substring(0, e);
}

/** Setext 下划线检测：返回 0(非) / 1(=,H1) / 2(-,H2)。
 *  规则：0-3 前导空格 → 连续的 '='+ 或 '-'+ → 其后仅空格/制表到行尾。4+ 前导空格 → 0。 */
function setextUnderlineType(line: string): number {
  let i: number = 0;
  while (i < line.length && line[i] === ' ') { i += 1; }
  if (i > 3) return 0;                 // 4+ 前导空格 → 非下划线（缩进）
  if (i >= line.length) return 0;      // 全空白
  const ch: string = line[i];
  if (ch !== '=' && ch !== '-') return 0;
  // 连续 run
  let j: number = i;
  while (j < line.length && line[j] === ch) { j += 1; }
  // 其后只能是尾随空格/制表
  while (j < line.length) {
    const c: string = line[j];
    if (c !== ' ' && c !== '\t') return 0;
    j += 1;
  }
  return ch === '=' ? 1 : 2;
}

// ── 行级辅助 ──

export function isThematicBreak(line: string): boolean {
  if (countIndentColumns(line) >= 4) return false;   // 缩进≥4 → 非分割线
  const trimmed: string = line.trim();
  if (trimmed.length < 3) return false;
  const ch: string = trimmed[0];
  if (ch !== '-' && ch !== '_' && ch !== '*') return false;
  // 检查是否全是相同字符（允许空格穿插）
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] !== ch && trimmed[i] !== ' ') return false;
  }
  return true;
}

export function isBulletListMarker(line: string): boolean {
  return parseBulletMarker(line) !== null;
}

export function isOrderedListMarker(line: string): boolean {
  // 基于 parseOrderedMarker，现在也认 "数字)" 不只是 "数字."
  return parseOrderedMarker(line) !== null;
}

/**
 * 检测行是否是非空列表 marker（含内容的 marker）。
 * CommonMark: 空列表项不能打断段落（parserParagraph 和 block quote 懒续行均不应被空 marker 打断）。
 * 返回 true 表示该行是「含内容」的列表 marker，可以打断段落。
 */
function isNonEmptyListMarker(line: string): boolean {
  const bm: BulletMarker | null = parseBulletMarker(line);
  if (bm !== null) {
    const fc: string = substringByColumn(line, bm.contentCol);
    return !isBlankLine(fc);
  }
  const om: OrderedMarker | null = parseOrderedMarker(line);
  if (om !== null) {
    const fc: string = substringByColumn(line, om.contentCol);
    return !isBlankLine(fc);
  }
  return false;
}
