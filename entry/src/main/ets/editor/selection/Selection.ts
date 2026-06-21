/**
 * Selection — 选区模型
 *
 * 对标 tui.editor 的 selection/selection.ts。
 * 管理编辑器的文本选择和光标位置，支持行列坐标与字符偏移量的双向转换。
 */

/** 行列位置 */
export class SelectionPos {
  line: number = 0;   // 0-based 行号
  col: number = 0;    // 0-based 列号
  offset: number = 0;  // 字符偏移量

  static create(line: number, col: number, offset: number): SelectionPos {
    const pos: SelectionPos = new SelectionPos();
    pos.line = line;
    pos.col = col;
    pos.offset = offset;
    return pos;
  }
}

/** 选区范围 — 对标 tui.editor SelectionRange */
export class SelectionRange {
  from: SelectionPos = new SelectionPos();
  to: SelectionPos = new SelectionPos();
  collapsed: boolean = true;
  direction: SelectionDirection = SelectionDirection.None;

  /** 选中文本长度 */
  get length(): number {
    return this.to.offset - this.from.offset;
  }

  /** 从行列创建 */
  static create(
    fromLine: number, fromCol: number, fromOffset: number,
    toLine: number, toCol: number, toOffset: number,
    collapsed: boolean
  ): SelectionRange {
    const range: SelectionRange = new SelectionRange();
    range.from = SelectionPos.create(fromLine, fromCol, fromOffset);
    range.to = SelectionPos.create(toLine, toCol, toOffset);
    range.collapsed = collapsed;
    return range;
  }
}

/** 选择方向 */
export enum SelectionDirection {
  None = 'none',
  Forward = 'forward',   // →
  Backward = 'backward', // ←
}

/**
 * Selection 管理器 — 对标 tui.editor Selection 类。
 * 提供：从 TextArea 文本和光标位置构建选区、偏移量→行列转换、选择范围计算。
 */
export class Selection {
  // 基础位置
  startLine: number = 0;
  startCol: number = 0;
  startOffset: number = 0;
  endLine: number = 0;
  endCol: number = 0;
  endOffset: number = 0;
  collapsed: boolean = true;
  direction: SelectionDirection = SelectionDirection.None;

  /** 缓存的行首偏移量表（用于 O(log n) 查找） */
  private lineOffsets: number[] = [];

  /**
   * 从 TextArea 的 selectionStart/selectionEnd 和文本内容重建选区。
   */
  static fromTextArea(
    text: string,
    selStart: number,
    selEnd: number
  ): Selection {
    const sel: Selection = new Selection();
    sel.buildLineOffsets(text);

    const startPos: SelectionPos = sel.offsetToPos(selStart);
    const endPos: SelectionPos = sel.offsetToPos(selEnd);

    sel.startLine = startPos.line;
    sel.startCol = startPos.col;
    sel.startOffset = selStart;
    sel.endLine = endPos.line;
    sel.endCol = endPos.col;
    sel.endOffset = selEnd;
    sel.collapsed = selStart === selEnd;

    if (selStart < selEnd) {
      sel.direction = SelectionDirection.Forward;
    } else if (selStart > selEnd) {
      sel.direction = SelectionDirection.Backward;
    }
    return sel;
  }

  /** 获取选中文本 */
  getSelectedText(text: string): string {
    if (this.collapsed) return '';
    const start: number = Math.min(this.startOffset, this.endOffset);
    const end: number = Math.max(this.startOffset, this.endOffset);
    return text.substring(start, end);
  }

  /** 获取范围 */
  getRange(): SelectionRange {
    return SelectionRange.create(
      this.startLine, this.startCol, this.startOffset,
      this.endLine, this.endCol, this.endOffset,
      this.collapsed
    );
  }

  /** 选区是否跨行 */
  isMultiline(): boolean {
    return this.startLine !== this.endLine;
  }

  // ── 私有 ──

  /** 构建每行起始偏移量索引 */
  private buildLineOffsets(text: string): void {
    this.lineOffsets = [];
    this.lineOffsets.push(0);
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineOffsets.push(i + 1);
      }
    }
    // 虚拟文件尾
    this.lineOffsets.push(text.length + 1);
  }

  /** 字符偏移量 → 行列位置（二分查找） */
  offsetToPos(offset: number): SelectionPos {
    let line: number = 0;
    let lo: number = 0;
    let hi: number = this.lineOffsets.length - 2;

    while (lo <= hi) {
      const mid: number = Math.floor((lo + hi) / 2);
      if (this.lineOffsets[mid] <= offset) {
        line = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    const col: number = offset - this.lineOffsets[line];
    return SelectionPos.create(line, col, offset);
  }
}
