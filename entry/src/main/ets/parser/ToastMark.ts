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
import { linkRefs } from './commonmark/LinkRefs';
import { parseLinkRefDefLine, LinkRefDefParseResult } from './commonmark/Inlines';

export class ToastMark {
  private state: ParseState = new ParseState();

  /** 解析 Markdown 字符串为 AST 文档树 */
  parse(markdown: string): AstNode {
    // 1. 清空引用链接定义表
    linkRefs.clear();

    // 2. 预扫全文收集 [label]: dest "title" 定义（前向引用支持）
    const preScan: string = markdown
      .split('\r\n').join('\n')
      .split('\r').join('\n');
    const lines: string[] = preScan.split('\n');
    for (let i: number = 0; i < lines.length; i++) {
      const result: LinkRefDefParseResult | null = parseLinkRefDefLine(lines[i]);
      if (result) {
        linkRefs.set(result.label, result.def);
      }
    }

    // 3. 正常块级解析（定义行在 Blocks 中被消费为不渲染的空段落）
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
