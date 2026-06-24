/**
 * HtmlRenderer — AST → HTML 渲染器
 *
 * 对标 tui.editor 的 libs/toastmark/src/html/renderer.ts。
 * 将 Markdown AST 渲染为 HTML 字符串，支持 GFM 扩展。
 */

import { AstNode, AstNodeType } from '../commonmark/Node';

export interface RenderOptions {
  darkMode?: boolean;
  fontSize?: number;
  inline?: boolean;
}

const DEFAULT_OPTIONS: RenderOptions = {
  darkMode: false,
  fontSize: 16,
  inline: false,
};

export class HtmlRenderer {
  private options: RenderOptions;

  constructor(opts?: RenderOptions) {
    this.options = opts ? this.mergeOptions(opts) : DEFAULT_OPTIONS;
  }

  private mergeOptions(opts: RenderOptions): RenderOptions {
    const result: RenderOptions = {
      darkMode: opts.darkMode !== undefined ? opts.darkMode : DEFAULT_OPTIONS.darkMode,
      fontSize: opts.fontSize !== undefined ? opts.fontSize : DEFAULT_OPTIONS.fontSize,
      inline: opts.inline !== undefined ? opts.inline : DEFAULT_OPTIONS.inline,
    };
    return result;
  }

  /** 渲染 AST 为完整 HTML 页面 */
  renderFullPage(ast: AstNode): string {
    const body: string = this.renderBody(ast);
    const bg: string = this.options.darkMode ? '#1e1e1e' : '#ffffff';
    const fg: string = this.options.darkMode ? '#d4d4d4' : '#24292e';
    const codeBg: string = this.options.darkMode ? '#2d2d2d' : '#f6f8fa';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${bg};
    color: ${fg};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: ${this.options.fontSize}px;
    line-height: 1.6;
    padding: 20px;
    max-width: 900px;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px; line-height: 1.3; }
  h1 { font-size: 1.8em; border-bottom: 1px solid ${this.options.darkMode ? '#404040' : '#dfe2e5'}; padding-bottom: 8px; }
  h2 { font-size: 1.5em; border-bottom: 1px solid ${this.options.darkMode ? '#404040' : '#dfe2e5'}; padding-bottom: 6px; }
  h3 { font-size: 1.25em; }
  p { margin: 8px 0; }
  code { background: ${codeBg}; padding: 2px 6px; border-radius: 4px; font-family: 'Cascadia Code', monospace; font-size: 0.9em; }
  pre { background: ${codeBg}; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 4px solid ${this.options.darkMode ? '#569cd6' : '#0366d6'};
    padding: 4px 16px;
    margin: 12px 0;
    background: ${this.options.darkMode ? '#252526' : '#f8f9fa'};
  }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td {
    border: 1px solid ${this.options.darkMode ? '#404040' : '#dfe2e5'};
    padding: 8px 12px;
    text-align: left;
  }
  th { background: ${this.options.darkMode ? '#2d2d2d' : '#f6f8fa'}; font-weight: 600; }
  a { color: ${this.options.darkMode ? '#569cd6' : '#0366d6'}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid ${this.options.darkMode ? '#404040' : '#dfe2e5'}; margin: 16px 0; }
  .task-list { list-style: none; padding-left: 0; }
  .task-list li { display: flex; align-items: center; gap: 6px; }
  .task-check { width: 16px; height: 16px; }
</style>
</head>
<body>
<div class="markdown-body">${body}</div>
</body>
</html>`;
  }

  /** 渲染 AST 为 body HTML（不含 <html> 包裹）*/
  renderBody(ast: AstNode): string {
    let html: string = '';
    for (let i = 0; i < ast.children.length; i++) {
      html += this.renderNode(ast.children[i]);
    }
    return html;
  }

  // ── 节点渲染 ──

  private renderNode(node: AstNode): string {
    switch (node.type) {
      case AstNodeType.Paragraph: return this.renderParagraph(node);
      case AstNodeType.Heading: return this.renderHeading(node);
      case AstNodeType.CodeBlock: return this.renderCodeBlock(node);
      case AstNodeType.BlockQuote: return this.renderBlockQuote(node);
      case AstNodeType.BulletList: return this.renderList(node, false);
      case AstNodeType.OrderedList: return this.renderList(node, true);
      case AstNodeType.ListItem: return this.renderListItem(node);
      case AstNodeType.Table: return this.renderTable(node);
      case AstNodeType.ThematicBreak: return '<hr />\n';
      case AstNodeType.HtmlBlock: return node.getTextContent() + '\n';
      case AstNodeType.HtmlInline: return node.text;
      case AstNodeType.CustomBlock: return '<div class="custom-block">' + this.renderChildren(node) + '</div>\n';
      case AstNodeType.FrontMatter: return '';  // 不渲染 YAML front matter
      case AstNodeType.Text: return this.escapeHtml(node.text);
      case AstNodeType.Emph: return this.renderInline('em', node);
      case AstNodeType.Strong: return this.renderInline('strong', node);
      case AstNodeType.Strike: return this.renderInline('del', node);
      case AstNodeType.Code: return this.renderCode(node);
      case AstNodeType.Link: return this.renderLink(node);
      case AstNodeType.Image: return this.renderImage(node);
      case AstNodeType.SoftBreak: return '\n';
      case AstNodeType.HardBreak: return '<br />\n';
      case AstNodeType.FootnoteRef: return '<sup class="footnote-ref"><a href="#fn-' + this.escapeAttr(node.text) + '" id="fnref-' + this.escapeAttr(node.text) + '">[' + this.escapeHtml(node.text) + ']</a></sup>';
      case AstNodeType.FootnoteDef: return '<div class="footnote" id="fn-' + this.escapeAttr(node.attrs.url) + '"><a href="#fnref-' + this.escapeAttr(node.attrs.url) + '">[' + this.escapeHtml(node.attrs.url) + ']</a>: ' + this.renderChildren(node) + '</div>\n';
      case AstNodeType.TableHead:
      case AstNodeType.TableBody:
      case AstNodeType.TableRow:
      case AstNodeType.TableCell:
        return this.renderTablePart(node);
      default:
        // 递归子节点
        let result: string = '';
        for (let i = 0; i < node.children.length; i++) {
          result += this.renderNode(node.children[i]);
        }
        return result;
    }
  }

  private renderParagraph(node: AstNode): string {
    const inner: string = this.renderChildren(node);
    const trimmed: string = inner.trim();
    if (trimmed === '') return '';
    // 检查是否包含块级元素（图片单独成行）
    return '<p>' + inner + '</p>\n';
  }

  private renderHeading(node: AstNode): string {
    const level: number = Math.min(Math.max(node.attrs.level, 1), 6);
    const inner: string = this.renderChildren(node);
    return '<h' + level + '>' + inner + '</h' + level + '>\n';
  }

  private renderCodeBlock(node: AstNode): string {
    const info: string = node.attrs.info;
    // language class = info 第一个空白(空格/Tab)分隔 token
    let endTok: number = info.length;
    for (let k: number = 0; k < info.length; k++) {
      const c: string = info[k];
      if (c === ' ' || c === '\t') { endTok = k; break; }
    }
    const langWord: string = info.substring(0, endTok);
    const lang: string = langWord ? ' class="language-' + this.escapeHtml(langWord) + '"' : '';
    const code: string = this.escapeHtml(node.getTextContent());
    return '<pre><code' + lang + '>' + code + '</code></pre>\n';
  }

  private renderBlockQuote(node: AstNode): string {
    const inner: string = this.renderChildren(node);
    return '<blockquote>\n' + inner + '</blockquote>\n';
  }

  private renderList(node: AstNode, ordered: boolean): string {
    if (ordered && node.attrs.start !== 1) {
      const inner: string = this.renderChildren(node);
      return '<ol start="' + node.attrs.start + '">\n' + inner + '</ol>\n';
    }
    const tag: string = ordered ? 'ol' : 'ul';
    const inner: string = this.renderChildren(node);
    return '<' + tag + '>\n' + inner + '</' + tag + '>\n';
  }

  private renderListItem(node: AstNode): string {
    const isTight: boolean = node.attrs.tight === true;
    // 任务列表
    if (node.attrs.checked !== null) {
      const checked: string = node.attrs.checked ? ' checked' : '';
      const checkHtml: string = '<input type="checkbox" disabled' + checked + ' class="task-check" /> ';
      const inner: string = this.renderListItemChildren(node, isTight);
      return '<li class="task-item">' + checkHtml + inner + '</li>\n';
    }
    const inner: string = this.renderListItemChildren(node, isTight);
    if (isTight) {
      return '<li>' + inner + '</li>\n';
    }
    return '<li>\n' + inner + '</li>\n';
  }

  /** 渲染列表项子节点，tight 时解包直接子 Paragraph（不包 p） */
  private renderListItemChildren(node: AstNode, tight: boolean): string {
    let result: string = '';
    for (let i: number = 0; i < node.children.length; i++) {
      const child: AstNode = node.children[i];
      if (tight && child.type === AstNodeType.Paragraph) {
        // Tight: 只渲染段落 inner，不包 <p>
        result += this.renderChildren(child);
      } else {
        // Tight 时非段落块级子节点前补条件换行（CommonMark 5.2/5.3）
        if (tight && (result.length === 0 || result[result.length - 1] !== '\n')) {
          result += '\n';
        }
        result += this.renderNode(child);
      }
    }
    return result;
  }

  private renderTable(node: AstNode): string {
    let html: string = '<table>\n';
    for (let i = 0; i < node.children.length; i++) {
      html += this.renderTablePart(node.children[i]);
    }
    html += '</table>\n';
    return html;
  }

  private renderTablePart(node: AstNode): string {
    if (node.type === AstNodeType.TableHead) {
      return '<thead>\n' + this.renderChildren(node) + '</thead>\n';
    }
    if (node.type === AstNodeType.TableBody) {
      return '<tbody>\n' + this.renderChildren(node) + '</tbody>\n';
    }
    if (node.type === AstNodeType.TableRow) {
      const cellTag: string = node.attrs.headerRow ? 'th' : 'td';
      let html: string = '<tr>\n';
      for (let i = 0; i < node.children.length; i++) {
        // 表格对齐（从父级 Table 节点获取）
        let align: string = '';
        if (node.parent && node.parent.parent) {
          const table: AstNode = node.parent.parent;
          if (table.type === AstNodeType.Table && i < table.attrs.alignments.length) {
            const a: string = table.attrs.alignments[i];
            if (a !== 'left') align = ' style="text-align:' + a + '"';
          }
        }
        html += '<' + cellTag + align + '>' + this.renderNode(node.children[i]) + '</' + cellTag + '>\n';
      }
      html += '</tr>\n';
      return html;
    }
    // TableCell
    return this.renderChildren(node);
  }

  // ── 行内渲染 ──

  private renderInline(tag: string, node: AstNode): string {
    const inner: string = this.renderChildren(node);
    return '<' + tag + '>' + inner + '</' + tag + '>';
  }

  private renderCode(node: AstNode): string {
    return '<code>' + this.escapeHtml(node.text) + '</code>';
  }

  private renderLink(node: AstNode): string {
    const inner: string = this.renderChildren(node);
    const url: string = this.escapeAttr(node.attrs.url);
    const title: string = node.attrs.title ? ' title="' + this.escapeAttr(node.attrs.title) + '"' : '';
    return '<a href="' + url + '"' + title + '>' + inner + '</a>';
  }

  private renderImage(node: AstNode): string {
    const url: string = this.escapeAttr(node.attrs.url);
    const alt: string = this.escapeAttr(node.attrs.alt || '');
    const title: string = node.attrs.title ? ' title="' + this.escapeAttr(node.attrs.title) + '"' : '';
    return '<img src="' + url + '" alt="' + alt + '"' + title + ' />';
  }

  // ── 辅助 ──

  private renderChildren(node: AstNode): string {
    let result: string = '';
    for (let i = 0; i < node.children.length; i++) {
      result += this.renderNode(node.children[i]);
    }
    return result;
  }

  private escapeHtml(s: string): string {
    return s
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  private escapeAttr(s: string): string {
    return this.escapeHtml(s);
  }
}
