/**
 * SpecManager — Schema 管理器
 *
 * 对标 tui.editor 的 spec/specManager.ts。
 * 管理节点和标记的类型定义，提供查询接口。
 */

import { NodeType, NodeSpec, MarkType } from './NodeSpec';
import { MarkSpec } from './MarkSpec';

export class SpecManager {
  private static instance: SpecManager | null = null;
  private nodes: NodeSpec[] = [];
  private marks: MarkSpec[] = [];

  static getInstance(): SpecManager {
    if (!SpecManager.instance) {
      SpecManager.instance = new SpecManager();
    }
    return SpecManager.instance;
  }

  private constructor() {
    this.initNodes();
    this.initMarks();
  }

  // ── 节点定义 ──

  private initNodes(): void {
    const self: SpecManager = this;

    // 行内标记列表（方便复用）
    const allMarks: MarkType[] = [
      MarkType.Emph, MarkType.Strong, MarkType.Strike,
      MarkType.Code, MarkType.Link,
    ];

    self.addNode({ type: NodeType.Doc, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.Paragraph, NodeType.Heading, NodeType.CodeBlock,
        NodeType.BlockQuote, NodeType.BulletList, NodeType.OrderedList,
        NodeType.Table, NodeType.ThematicBreak, NodeType.HtmlBlock,
        NodeType.CustomBlock, NodeType.FrontMatter] });

    self.addNode({ type: NodeType.Paragraph, isBlock: true, inlineContent: true, isLeaf: false,
      allowMarks: allMarks });

    self.addNode({ type: NodeType.Heading, isBlock: true, inlineContent: true, isLeaf: false,
      allowMarks: allMarks });

    self.addNode({ type: NodeType.CodeBlock, isBlock: true, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.BlockQuote, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.Paragraph, NodeType.Heading, NodeType.CodeBlock,
        NodeType.BulletList, NodeType.OrderedList] });

    self.addNode({ type: NodeType.BulletList, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.ListItem] });

    self.addNode({ type: NodeType.OrderedList, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.ListItem] });

    self.addNode({ type: NodeType.ListItem, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.Paragraph, NodeType.CodeBlock, NodeType.BulletList, NodeType.OrderedList] });

    self.addNode({ type: NodeType.Table, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.TableHead, NodeType.TableBody] });

    self.addNode({ type: NodeType.TableHead, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.TableRow] });

    self.addNode({ type: NodeType.TableBody, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.TableRow] });

    self.addNode({ type: NodeType.TableRow, isBlock: true, inlineContent: false, isLeaf: false,
      allowChildren: [NodeType.TableHeadCell, NodeType.TableBodyCell] });

    self.addNode({ type: NodeType.TableHeadCell, isBlock: true, inlineContent: true, isLeaf: false,
      allowMarks: allMarks });

    self.addNode({ type: NodeType.TableBodyCell, isBlock: true, inlineContent: true, isLeaf: false,
      allowMarks: allMarks });

    self.addNode({ type: NodeType.Image, isBlock: false, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.ThematicBreak, isBlock: true, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.HtmlBlock, isBlock: true, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.CustomBlock, isBlock: true, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.FrontMatter, isBlock: true, inlineContent: false, isLeaf: true });

    self.addNode({ type: NodeType.Text, isBlock: false, inlineContent: false, isLeaf: true,
      allowMarks: allMarks });
  }

  // ── 标记定义 ──

  private initMarks(): void {
    this.addMark({ type: MarkType.Emph, tagName: 'em', markdownSyntax: '*', inclusive: true });
    this.addMark({ type: MarkType.Strong, tagName: 'strong', markdownSyntax: '**', inclusive: true });
    this.addMark({ type: MarkType.Strike, tagName: 'del', markdownSyntax: '~~', inclusive: true });
    this.addMark({ type: MarkType.Code, tagName: 'code', markdownSyntax: '`', inclusive: false });
    this.addMark({ type: MarkType.Link, tagName: 'a', markdownSyntax: '[]()', inclusive: true });
  }

  // ── 查询接口 ──

  addNode(spec: NodeSpec): void {
    this.nodes.push(spec);
  }

  getNode(type: NodeType): NodeSpec | null {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].type === type) return this.nodes[i];
    }
    return null;
  }

  isBlock(type: NodeType): boolean {
    const spec: NodeSpec | null = this.getNode(type);
    return spec ? spec.isBlock : false;
  }

  addMark(spec: MarkSpec): void {
    this.marks.push(spec);
  }

  getMark(type: MarkType): MarkSpec | null {
    for (let i = 0; i < this.marks.length; i++) {
      if (this.marks[i].type === type) return this.marks[i];
    }
    return null;
  }
}
