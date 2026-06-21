/**
 * ParseState — 解析流状态
 *
 * 封装 Markdown 输入字符串的逐行读取状态。
 * 传递给 Blocks / Inlines / Gfm 解析器函数，解耦状态管理。
 */

export class ParseState {
  input: string = '';
  pos: number = 0;
  len: number = 0;

  /** 初始化解析状态 */
  reset(input: string): void {
    this.input = input;
    this.pos = 0;
    this.len = input.length;
  }

  /** 当前位置所在行（不含换行符） */
  currentLine(): string {
    const start: number = this.pos;
    let end: number = this.pos;
    while (end < this.len && this.input[end] !== '\n') {
      end++;
    }
    return this.input.substring(start, end);
  }

  /** 移动 pos 到下一行开头 */
  nextLine(): void {
    while (this.pos < this.len && this.input[this.pos] !== '\n') {
      this.pos++;
    }
    if (this.pos < this.len) {
      this.pos++; // skip \n
    }
  }

  /** 跳过连续的空白行 */
  skipBlankLines(): void {
    while (this.pos < this.len) {
      const ch: string = this.input[this.pos];
      if (ch === '\n') {
        this.pos++;
      } else if (ch === '\r') {
        this.pos++;
      } else {
        break;
      }
    }
  }

  /** 流是否结束 */
  isEnd(): boolean {
    return this.pos >= this.len;
  }

  /** 保存当前位置（用于回溯） */
  save(): number {
    return this.pos;
  }

  /** 恢复到之前保存的位置 */
  restore(saved: number): void {
    this.pos = saved;
  }
}
