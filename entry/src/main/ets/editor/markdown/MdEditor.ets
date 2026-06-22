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
import { Handler } from '../../event/EventEmitter';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { editorContext } from '../EditorContext';

@Component
export struct MdEditor {
  @Prop themeColors: ThemeColors;
  @Prop fontSize: number = 16;
  @Prop placeholder: string = '开始编辑…';
  /** 长按回调 — 传递触摸点坐标（相对 TextArea） */
  onLongPress?: (localX: number, localY: number) => void;

  @State private editorText: string = '';
  @State private cursorLine: number = 1;
  @State private cursorCol: number = 1;
  @State private lineCount: number = 1;

  private controller: TextAreaController = new TextAreaController();
  private changeHandler: Handler = (): void => {};
  private caretChangeHandler: Handler = (): void => {};

  aboutToAppear(): void {
    hilog.info(0x0000, 'TUIEditor', 'MdEditor.aboutToAppear — editorCore: ' + editorContext.core);
    if (!editorContext.core) return;

    this.editorText = editorContext.core.getMarkdown();
    this.updateLineCount();

    const core: EditorCore = editorContext.core;
    const self: MdEditor = this;

    // 监听 EditorCore 内容变更（命令执行、撤销/重做）
    this.changeHandler = (): void => {
      self.editorText = core.getMarkdown();
      self.updateLineCount();
    };
    core.on('change', this.changeHandler);

    // 监听光标位置同步
    this.caretChangeHandler = (): void => {
      self.cursorLine = core.state.cursorLine;
      self.cursorCol = core.state.cursorCol;
    };
    core.on('caretChange', this.caretChangeHandler);
  }

  aboutToDisappear(): void {
    if (!editorContext.core) return;

    editorContext.core.off('change', this.changeHandler);
    editorContext.core.off('caretChange', this.caretChangeHandler);
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
          hilog.info(0x0000, 'TUIEditor', 'MdEditor.onChange — called with ' + value.length + ' chars, editorCore: ' + editorContext.core);
          this.editorText = value;
          if (editorContext.core) {
            editorContext.core.onContentChange(value);
          }
          this.updateLineCount();
        })
        .onTextSelectionChange((selectionStart: number, selectionEnd: number) => {
          hilog.info(0x0000, 'TUIEditor', 'MdEditor.onTextSelectionChange — selectionStart:' + selectionStart + ' selectionEnd:' + selectionEnd + ' hasRange:' + (selectionStart < selectionEnd));
          if (editorContext.core) {
            editorContext.core.updateSelection(selectionStart, selectionEnd);
            this.cursorLine = editorContext.core.state.cursorLine;
            this.cursorCol = editorContext.core.state.cursorCol;
          }
        })
        .onEditChange((status: boolean) => {
          if (editorContext.core) {
            if (status) {
              editorContext.core.focus();
            } else {
              editorContext.core.blur();
            }
          }
        })
        .gesture(
          LongPressGesture({ duration: 500, repeat: false })
            .onAction((event: GestureEvent) => {
              if (this.onLongPress) {
                const finger = event.fingerList[0];
                this.onLongPress(finger.localX, finger.localY);
              }
            })
        )
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
    if (editorContext.core) {
      this.controller.caretPosition(editorContext.core.state.selectionStart);
    }
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
