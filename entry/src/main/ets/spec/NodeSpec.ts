/**
 * NodeSpec — 节点类型定义
 *
 * 对标 tui.editor 的 spec/node.ts。
 * 定义编辑器支持的所有文档节点类型。
 */

export enum NodeType {
  Doc = 'doc',
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
  TableHeadCell = 'tableHeadCell',
  TableBodyCell = 'tableBodyCell',
  Image = 'image',
  ThematicBreak = 'thematicBreak',
  HtmlBlock = 'htmlBlock',
  CustomBlock = 'customBlock',
  FrontMatter = 'frontMatter',
  Text = 'text',
}

export interface NodeSpec {
  type: NodeType;
  /** 是否是块级元素 */
  isBlock: boolean;
  /** 是否包含内联内容 */
  inlineContent: boolean;
  /** 是否叶子节点 */
  isLeaf: boolean;
  /** 允许的子节点类型 */
  allowChildren?: NodeType[];
  /** 允许的标记类型 */
  allowMarks?: MarkType[];
}

// 前向声明（MarkType 在 MarkSpec 中定义）
export enum MarkType {
  Emph = 'emph',
  Strong = 'strong',
  Strike = 'strike',
  Code = 'code',
  Link = 'link',
}
