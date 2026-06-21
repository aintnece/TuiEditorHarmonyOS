/**
 * MdEditor — Markdown 编辑器组件
 *
 * 对标 tui.editor 的 Markdown 编辑区。基于 TextArea，集成 EditorCore
 * 的光标管理和内容同步。提供行号标尺、主题适配、等宽字体。
 *
 * 参考来源：F:\MarkdownEditor\entry\src\main\ets\components\MarkdownEditor.ets
 */

import { EditorCore } from '../EditorCore';
import { ThemeColors } from '../../services/ThemeService';

@Component
export struct MdEditor {
  @Prop editorCore: EditorCore;
  @Prop themeColors: ThemeColors;
  @Prop fontSize: number = 16;
  @Prop placeholder: string = '开始编辑…';

  @State private editorText: string = '';
  @State private cursorLine: number = 1;
  @State private cursorCol: number = 1;
  @State private lineCount: number = 1;

  private controller: TextAreaController = new TextAreaController();

  aboutToAppear(): void {
    this.editorText = this.editorCore.getMarkdown();
    this.updateLineCount();

    const self: MdEditor = this;

    // 监听 EditorCore 内容变更（命令执行、撤销/重做）
    this.editorCore.on('change', (): void => {
      self.editorText = self.editorCore.getMarkdown();
      self.updateLineCount();
    });

    // 监听光标位置同步
    this.editorCore.on('caretChange', (): void => {
      self.cursorLine = self.editorCore.state.cursorLine;
      self.cursorCol = self.editorCore.state.cursorCol;
    });
  }

  build() {
    Row() {
      this.buildLineNumberGutter();

      TextArea({
        text: this.editorText,
        placeholder: this.placeholder,
        controller: this.controller,
      })
        .width('100%')
        .height('100%')
        .fontSize(this.fontSize)
        .fontColor(this.themeColors.editorFg)
        .backgroundColor(this.themeColors.editorBg)
        .caretColor(this.themeColors.editorCursor)
        .fontFamily("'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace")
        .padding({ left: 8, right: 8, top: 8, bottom: 8 })
        .borderRadius(0)
        .borderWidth(0)
        .onChange((value: string) => {
          this.editorText = value;
          this.editorCore.onContentChange(value);
          this.updateLineCount();
        })
        .onTextSelectionChange((selectionStart: number, selectionEnd: number) => {
          this.editorCore.updateSelection(selectionStart, selectionEnd);
          this.cursorLine = this.editorCore.state.cursorLine;
          this.cursorCol = this.editorCore.state.cursorCol;
        })
        .onEditChange((status: boolean) => {
          if (status) {
            this.editorCore.focus();
          } else {
            this.editorCore.blur();
          }
        })
        .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.themeColors.editorBg)
  }

  // ── 行号标尺 ──

  @Builder
  buildLineNumberGutter() {
    Column() {
      ForEach(this.getVisibleLines(), (lineNum: number) => {
        Text(lineNum.toString())
          .fontSize(this.fontSize * 0.85)
          .fontColor(this.themeColors.editorLineNumber)
          .fontFamily("'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace")
          .textAlign(TextAlign.End)
          .width('100%')
          .height(this.fontSize * 1.6)
          .padding({ right: 8 })
          .backgroundColor(
            lineNum === this.cursorLine
              ? this.themeColors.editorActiveLine
              : Color.Transparent
          )
      }, (lineNum: number) => lineNum.toString())
    }
    .width(40)
    .height('100%')
    .padding({ top: 8 })
    .backgroundColor(this.themeColors.editorGutter)
    .alignItems(HorizontalAlign.End)
    .clip(true)
  }

  getVisibleLines(): number[] {
    const lines: number[] = [];
    for (let i = 1; i <= this.lineCount; i++) {
      lines.push(i);
    }
    return lines;
  }

  // ── 公开方法 ──

  /** 聚焦编辑器 */
  focus(): void {
    this.controller.caretPosition(this.editorCore.state.selectionStart);
  }

  // ── 私有 ──

  private updateLineCount(): void {
    let count = 1;
    const text: string = this.editorText;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        count++;
      }
    }
    this.lineCount = count;
  }
}
