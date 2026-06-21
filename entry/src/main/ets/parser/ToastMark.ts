/**
 * ToastMark — Markdown 解析器主 API
 *
 * 对标 tui.editor 的 libs/toastmark/src/toastmark.ts。
 * CommonMark + GFM 规范解析，生成 AstNode 语法树。
 *
 * 解析流程：
 *   markdown string → 块级解析(Blocks.ts) → 行内解析(Inlines.ts) → AstNode
 *
 * 架构：ToastMark 为薄层入口，持有 ParseState 流状态，
 * 块级/行内/GFM 解析逻辑分别委托给 Blocks / Inlines / Gfm 模块。
 */

import { AstNode, AstNodeType } from './commonmark/Node';
import { ParseState } from './commonmark/ParseState';
import { parseBlocks } from './commonmark/Blocks';

export class ToastMark {
  private state: ParseState = new ParseState();

  /** 解析 Markdown 字符串为 AST 文档树 */
  parse(markdown: string): AstNode {
    this.state.reset(markdown);
    const doc: AstNode = new AstNode(AstNodeType.Document);
    parseBlocks(this.state, doc);
    return doc;
  }

  /** 获取解析流状态（供外部扩展使用） */
  getState(): ParseState {
    return this.state;
  }
}
