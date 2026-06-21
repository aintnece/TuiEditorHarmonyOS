/**
 * Node — AST 节点定义
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/node.ts。
 * Markdown 解析生成的抽象语法树节点。
 */

export enum AstNodeType {
  Document = 'document',
  Paragraph = 'paragraph',
  Heading = 'heading',
  CodeBlock = 'codeBlock',
  BlockQuote = 'blockQuote',
  BulletList = 'bulletList',
  OrderedList = 'orderedList',
  ListItem = 'listItem',
  Table = 'table',
  TableHead = 'tableHead',
  TableBody = 'tableBody',
  TableRow = 'tableRow',
  TableCell = 'tableCell',
  ThematicBreak = 'thematicBreak',
  HtmlBlock = 'htmlBlock',
  CustomBlock = 'customBlock',
  FrontMatter = 'frontMatter',
  Text = 'text',
  Emph = 'emph',
  Strong = 'strong',
  Strike = 'strike',
  Code = 'code',
  Link = 'link',
  Image = 'image',
  SoftBreak = 'softBreak',
  HardBreak = 'hardBreak',
  // GFM 脚注
  FootnoteRef = 'footnoteRef',
  FootnoteDef = 'footnoteDef',
}

/** AST 节点 */
export class AstNode {
  type: AstNodeType;
  parent: AstNode | null = null;
  children: AstNode[] = [];
  text: string = '';
  attrs: AstAttrs = new AstAttrs();

  // 源位置信息（对标 ToastMark 的 sourcepos）
  sourceStart: number = 0;
  sourceEnd: number = 0;

  constructor(type: AstNodeType) {
    this.type = type;
  }

  /** 添加子节点 */
  appendChild(child: AstNode): void {
    child.parent = this;
    this.children.push(child);
  }

  /** 遍历所有节点 */
  walk(callback: (node: AstNode, depth: number) => boolean | void): void {
    const self: AstNode = this;
    function walker(node: AstNode, depth: number): boolean {
      const result: boolean | void = callback(node, depth);
      if (result === false) return false;
      for (let i = 0; i < node.children.length; i++) {
        if (walker(node.children[i], depth + 1) === false) return false;
      }
      return true;
    }
    walker(self, 0);
  }

  /** 获取文本内容 */
  getTextContent(): string {
    if (this.text !== '') return this.text;
    let result: string = '';
    for (let i = 0; i < this.children.length; i++) {
      result += this.children[i].getTextContent();
    }
    return result;
  }
}

/** 节点属性 */
export class AstAttrs {
  level: number = 0;        // 标题级别 (1-6)
  url: string = '';         // 链接/图片 URL
  title: string = '';       // 链接 title
  alt: string = '';         // 图片 alt
  info: string = '';        // 代码块语言标记
  ordered: boolean = false; // 有序列表
  start: number = 1;        // 有序列表起始编号
  checked: boolean | null = null; // 任务列表状态 (null = 非任务)
  alignments: string[] = [];      // 表格列对齐
  headerRow: boolean = false;     // 表格头行
}
