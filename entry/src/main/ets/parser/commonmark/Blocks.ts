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

/** 列表（有序或无序） */
export function parseList(state: ParseState, ordered: boolean): AstNode {
  const listType: AstNodeType = ordered
    ? AstNodeType.OrderedList : AstNodeType.BulletList;
  const list: AstNode = new AstNode(listType);
  list.attrs.ordered = ordered;

  while (!state.isEnd()) {
    const line: string = state.currentLine();
    if (ordered && !isOrderedListMarker(line)) break;
    if (!ordered && !isBulletListMarker(line)) break;

    const item: AstNode = new AstNode(AstNodeType.ListItem);

    // 提取列表项文本（跳过标记部分）
    let itemText: string = '';
    if (ordered) {
      // 找 ". " 的位置
      const dotIdx: number = line.indexOf('.');
      itemText = line.substring(dotIdx + 1).trimStart();
    } else {
      // 跳过 "- " / "* " / "+ "
      itemText = line.substring(2).trimStart();
    }
    state.nextLine();

    // 任务列表检测 (GFM)
    const trimmed: string = itemText;
    if (trimmed.startsWith('[ ] ')) {
      item.attrs.checked = false;
      itemText = itemText.substring(itemText.indexOf(']') + 1).trim();
    } else if (trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
      item.attrs.checked = true;
      itemText = itemText.substring(itemText.indexOf(']') + 1).trim();
    }

    // 收集子块（缩进内容）
    let subContent: string = '';
    while (!state.isEnd()) {
      const next: string = state.currentLine();
      // 缩进行（2+ 空格或 tab）
      if (next.startsWith('  ') || next.startsWith('\t')) {
        subContent += next.trimStart() + '\n';
        state.nextLine();
      } else if (next === '') {
        // 空行可能是子块结束
        subContent += '\n';
        state.nextLine();
      } else if (isBulletListMarker(next) || isOrderedListMarker(next)) {
        break;
      } else {
        // 非缩进非标记行 — 检查是否是段落续行
        break;
      }
    }

    if (subContent !== '') {
      // 递归解析子块
      const innerState: ParseState = new ParseState();
      innerState.reset(subContent);
      parseBlocks(innerState, item);
    }

    parseInlines(itemText, item);
    if (item.children.length === 0) {
      const txt: AstNode = new AstNode(AstNodeType.Text);
      txt.text = itemText;
      item.appendChild(txt);
    }
    list.appendChild(item);
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

    text += (text !== '' ? '\n' : '') + line;
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
      code += '\n';
      state.nextLine();
      continue;
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
  return (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ '));
}

export function isOrderedListMarker(line: string): boolean {
  // 匹配 "1. " "123. " 等
  let dotIdx: number = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '.') { dotIdx = i; break; }
    if (line[i] < '0' || line[i] > '9') return false;
  }
  if (dotIdx <= 0) return false;
  if (dotIdx > 9) return false; // 最多 9 位数字
  // 后面必须有空格或 tab
  if (dotIdx + 1 < line.length && (line[dotIdx + 1] === ' ' || line[dotIdx + 1] === '\t')) {
    return true;
  }
  return false;
}
