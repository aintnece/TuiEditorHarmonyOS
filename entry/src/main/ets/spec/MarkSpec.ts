/**
 * MarkSpec — 标记类型定义
 *
 * 对标 tui.editor 的 spec/mark.ts。
 * 定义编辑器支持的行内标记类型（粗体/斜体/删除线/代码/链接）。
 */

export enum MarkType {
  Emph = 'emph',
  Strong = 'strong',
  Strike = 'strike',
  Code = 'code',
  Link = 'link',
}

export interface MarkSpec {
  type: MarkType;
  /** 标记的显示名称 */
  tagName: string;
  /** Markdown 语法字符串 */
  markdownSyntax: string;
  /** 是否可以嵌套 */
  inclusive: boolean;
}
