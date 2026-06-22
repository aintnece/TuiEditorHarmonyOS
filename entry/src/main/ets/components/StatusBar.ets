/**
 * StatusBar — 底部状态栏
 *
 * 对标 tui.editor 的 statusbar 组件。
 * 显示字数统计、光标位置和编辑模式指示。
 * 通过 editorContext 全局单例监听 EditorCore 事件。
 */

import { ThemeColors } from '../services/ThemeService';
import { EditorType, ViewMode } from '../editor/EditorType';
import { Handler } from '../event/EventEmitter';
import { editorContext } from '../editor/EditorContext';

@Component
export struct StatusBar {
  @Prop themeColors: ThemeColors = new ThemeColors();

  @State private charCount: number = 0;
  @State private wordCount: number = 0;
  @State private cursorLine: number = 1;
  @State private cursorCol: number = 1;
  @State private editorType: EditorType = EditorType.Markdown;
  @State private viewMode: ViewMode = ViewMode.Split;

  private changeHandler: Handler = (): void => {};
  private caretChangeHandler: Handler = (): void => {};
  private stateChangeHandler: Handler = (): void => {};

  aboutToAppear(): void {
    if (!editorContext.core) return;

    const core = editorContext.core;
    const self: StatusBar = this;

    // 初始值
    self.charCount = core.getMarkdown().length;
    self.wordCount = self.countWords(core.getMarkdown());
    self.cursorLine = core.state.cursorLine;
    self.cursorCol = core.state.cursorCol;
    self.editorType = core.state.editorType;
    self.viewMode = core.state.viewMode;

    // 监听内容变更
    this.changeHandler = (): void => {
      const md: string = core.getMarkdown();
      self.charCount = md.length;
      self.wordCount = self.countWords(md);
    };
    core.on('change', this.changeHandler);

    // 监听光标变化
    this.caretChangeHandler = (): void => {
      self.cursorLine = core.state.cursorLine;
      self.cursorCol = core.state.cursorCol;
    };
    core.on('caretChange', this.caretChangeHandler);

    // 监听状态变化（模式切换）
    this.stateChangeHandler = (): void => {
      self.editorType = core.state.editorType;
      self.viewMode = core.state.viewMode;
    };
    core.on('stateChange', this.stateChangeHandler);
  }

  aboutToDisappear(): void {
    if (!editorContext.core) return;

    editorContext.core.off('change', this.changeHandler);
    editorContext.core.off('caretChange', this.caretChangeHandler);
    editorContext.core.off('stateChange', this.stateChangeHandler);
  }

  build() {
    Row() {
      // ── 字数统计 ──
      Text('字符 ' + this.charCount.toString())
        .fontSize(11)
        .fontColor(this.themeColors.editorPlaceholder)
        .margin({ left: 8, right: 12 })

      Text('词数 ' + this.wordCount.toString())
        .fontSize(11)
        .fontColor(this.themeColors.editorPlaceholder)
        .margin({ right: 12 })

      Blank()

      // ── 编辑模式 ──
      Text(this.getModeLabel())
        .fontSize(11)
        .fontColor(this.themeColors.editorPlaceholder)
        .margin({ right: 12 })

      // ── 光标位置 ──
      Text('行 ' + this.cursorLine.toString() + ', 列 ' + this.cursorCol.toString())
        .fontSize(11)
        .fontColor(this.themeColors.editorPlaceholder)
        .margin({ right: 8 })
    }
    .width('100%')
    .height(28)
    .backgroundColor(this.themeColors.toolbarBg)
    .border({ width: { top: 1 }, color: this.themeColors.borderColor })
    .padding({ left: 4, right: 4 })
  }

  /** 获取模式标签 */
  private getModeLabel(): string {
    if (this.editorType === EditorType.Wysiwyg) {
      return 'WYSIWYG';
    }
    // Markdown 模式
    if (this.viewMode === ViewMode.Split) {
      return '分屏预览';
    }
    if (this.viewMode === ViewMode.Preview) {
      return '仅预览';
    }
    return 'Markdown';
  }

  /** 统计词数（中文字符 + 英文单词） */
  private countWords(text: string): number {
    if (text.length === 0) return 0;

    let chineseCount: number = 0;
    const words: string[] = [];
    let currentWord: string = '';

    for (let i = 0; i < text.length; i++) {
      const code: number = text.charCodeAt(i);
      // 判断是否为中文字符（CJK 统一表意文字范围）
      const isChinese: boolean =
        (code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0xF900 && code <= 0xFAFF) ||
        (code >= 0x2E80 && code <= 0x2EFF) ||
        (code >= 0x3000 && code <= 0x303F);

      if (isChinese) {
        chineseCount++;
        if (currentWord !== '') {
          words.push(currentWord);
          currentWord = '';
        }
      } else {
        const isWhitespace: boolean =
          code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0D;
        if (isWhitespace) {
          if (currentWord !== '') {
            words.push(currentWord);
            currentWord = '';
          }
        } else {
          currentWord += text[i];
        }
      }
    }
    if (currentWord !== '') {
      words.push(currentWord);
    }

    return chineseCount + words.length;
  }
}
