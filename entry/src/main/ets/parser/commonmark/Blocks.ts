/**
 * Blocks — 块级解析器
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/blocks.ts。
 * 处理 Markdown 块级结构：标题、代码块、引用、列表、表格、分割线、段落。
 * 所有函数为纯函数，通过 ParseState 访问输入流。
 */

import { AstNode, AstNodeType } from './Node';
import { ParseState } from './ParseState';
import { parseInlines } from './Inlines';
import { parseLinkRefDefLine } from './Inlines';
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
  if (line.startsWith('```') || line.startsWith('~~~')) {
    return parseCodeBlock(state);
  }
  // ATX 标题
  if (line.startsWith('#')) {
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
  if (line.startsWith('>')) {
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

/** 围栏代码块 ```lang ... ``` */
export function parseCodeBlock(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.CodeBlock);
  const fence: string = state.currentLine();
  state.nextLine();

  // 提取语言标记（跳过开头的 ``` 或 ~~~）
  let infoStart: number = 0;
  if (fence.startsWith('```')) infoStart = 3;
  else if (fence.startsWith('~~~')) infoStart = 3;
  node.attrs.info = fence.substring(infoStart).trim();

  let code: string = '';
  const fenceChar: string = fence[0]; // ` 或 ~
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    // 匹配相同字符和长度的闭合围栏
    if (line.startsWith(fenceChar + fenceChar + fenceChar)) {
      state.nextLine();
      break;
    }
    code += line + '\n';
    state.nextLine();
  }
  const textNode: AstNode = new AstNode(AstNodeType.Text);
  textNode.text = code;
  node.appendChild(textNode);
  return node;
}

/** ATX 标题 # Heading */
export function parseHeading(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.Heading);
  const line: string = state.currentLine();
  state.nextLine();

  let level: number = 0;
  for (let i = 0; i < line.length && line[i] === '#'; i++) {
    level++;
  }
  node.attrs.level = level > 6 ? 6 : level;
  // 去除开头的 # 和结尾的 #（closing sequence）
  let text: string = line.substring(level).trim();
  // 去除结尾的 # 序列
  let endIdx: number = text.length - 1;
  while (endIdx >= 0 && text[endIdx] === '#') {
    endIdx--;
  }
  text = text.substring(0, endIdx + 1).trim();
  parseInlines(text, node);
  return node;
}

/** 分割线 --- / *** / ___ */
export function parseThematicBreak(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.ThematicBreak);
  state.nextLine();
  return node;
}

/** 块引用 > content */
export function parseBlockQuote(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.BlockQuote);

  // 收集所有连续引用行
  let content: string = '';
  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (!line.startsWith('>')) break;
    // 移除引用标记（可选空格）
    let rest: string = line.substring(1);
    if (rest.length > 0 && rest[0] === ' ') {
      rest = rest.substring(1);
    }
    content += rest + '\n';
    state.nextLine();
  }

  // 递归解析引用内容
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
  if (line.length < 2) return null;
  const ch: string = line[0];
  if (ch !== '-' && ch !== '*' && ch !== '+') return null;
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
  // 必须后跟 ≥1 空白
  if (i + 1 >= line.length) return null;
  if (line[i + 1] !== ' ' && line[i + 1] !== '\t') return null;

  // marker 文本结束位置：(i+1) 是分隔符之后第一个字符位置
  // marker 文本宽度 = i + 1 列（数字 + 分隔符各 1 列）
  const markerEndIdx: number = i + 1;
  const markerWidth: number = markerEndIdx; // 数字和分隔符都是单宽字符

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
    itemLines.push(firstContent);
    let itemHadBlank: boolean = false;

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
    if (line.startsWith('#') || line.startsWith('```') || line.startsWith('~~~')) break;
    if (line.startsWith('>')) break;
    if (isBulletListMarker(line) || isOrderedListMarker(line)) break;
    if (isThematicBreak(line)) break;
    // HTML 块
    if (isHtmlBlockStart(line)) break;

    text += (text !== '' ? '\n' : '') + line.trimStart();
    state.nextLine();

    // Setext 标题前瞻：下一行是 === 或 ---
    if (!state.isEnd()) {
      const nextLine: string = state.currentLine();
      if (isSetextUnderline(nextLine)) {
        // 创建标题节点替代段落
        const heading: AstNode = new AstNode(AstNodeType.Heading);
        heading.attrs.level = nextLine.startsWith('=') ? 1 : 2;
        parseInlines(text, heading);
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
  if (isHtmlBlockStart(line)) return true;
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

/** HTML 块起始检测 */
function isHtmlBlockStart(line: string): boolean {
  const trimmed: string = line.trimStart();
  if (!trimmed.startsWith('<')) return false;
  // Type 6: 以特定标签开头的行
  const tags: string[] = ['<address', '<article', '<aside', '<base', '<basefont',
    '<blockquote', '<body', '<caption', '<center', '<col', '<colgroup', '<dd',
    '<details', '<dialog', '<dir', '<div', '<dl', '<dt', '<fieldset', '<figcaption',
    '<figure', '<footer', '<form', '<frame', '<frameset', '<h1', '<h2', '<h3',
    '<h4', '<h5', '<h6', '<head', '<header', '<hr', '<html', '<iframe', '<legend',
    '<li', '<link', '<main', '<menu', '<menuitem', '<nav', '<noframes', '<ol',
    '<optgroup', '<option', '<p', '<param', '<section', '<source', '<summary',
    '<table', '<tbody', '<td', '<tfoot', '<th', '<thead', '<title', '<tr', '<track',
    '<ul', '<pre', '<script', '<style'];
  const lower: string = trimmed.toLowerCase();
  for (let i = 0; i < tags.length; i++) {
    if (lower.startsWith(tags[i])) return true;
  }
  // Type 7: </...> 或 <.../> 或 <... >
  if (trimmed.startsWith('</')) return true;
  // Type 1: <!-- ... --> 或 <![CDATA[
  if (trimmed.startsWith('<!--') || trimmed.startsWith('<![CDATA[')) return true;
  // Type 2: <? ... ?>
  if (trimmed.startsWith('<?')) return true;
  return false;
}

/** 解析 HTML 块 */
function parseHtmlBlock(state: ParseState): AstNode {
  const node: AstNode = new AstNode(AstNodeType.HtmlBlock);
  let html: string = '';

  while (!state.isEnd()) {
    const line: string = state.currentLine();
    html += line + '\n';
    state.nextLine();
    // 空行后结束 HTML 块
    if (line === '') break;
  }

  const textNode: AstNode = new AstNode(AstNodeType.Text);
  textNode.text = html.trim();
  node.appendChild(textNode);
  return node;
}

/** Setext 标题下划线检测 */
function isSetextUnderline(line: string): boolean {
  if (line.length < 1) return false;
  const ch: string = line[0];
  if (ch !== '=' && ch !== '-') return false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== ch && line[i] !== ' ') return false;
  }
  return true;
}

// ── 行级辅助 ──

export function isThematicBreak(line: string): boolean {
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
