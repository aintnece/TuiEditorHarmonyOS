/**
 * Toolbar — 编辑器工具栏
 *
 * 对标 tui.editor 的 toolbar + toolbarItem 组件。
 * 22 个按钮全部内联在 build() 中（bindPopup 不可在 @Builder 中使用）。
 */

import { Editor } from '../editor/Editor';
import { EditorCore } from '../editor/EditorCore';
import { EditorType, ViewMode } from '../editor/EditorType';
import { ThemeColors } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';

@Component
export struct Toolbar {
  @Prop editor: Editor = Editor.factory();
  @Prop themeColors: ThemeColors = new ThemeColors();
  onExport?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onTable?: () => void;

  // ── bindPopup 状态（每个按钮独立 @State）──
  @State hBold: boolean = false; @State hItalic: boolean = false;
  @State hStrike: boolean = false; @State hCode: boolean = false;
  @State hHeading: boolean = false; @State hQuote: boolean = false;
  @State hBullet: boolean = false; @State hOrdered: boolean = false;
  @State hTask: boolean = false; @State hCodeblock: boolean = false;
  @State hLink: boolean = false; @State hImage: boolean = false;
  @State hTable: boolean = false; @State hHr: boolean = false;
  @State hEdit: boolean = false; @State hSplit: boolean = false;
  @State hPreview: boolean = false; @State hWysiwyg: boolean = false;
  @State hUndo: boolean = false; @State hRedo: boolean = false;
  @State hExport: boolean = false;

  // ── timers ──
  private tBold: number = 0; private tItalic: number = 0;
  private tStrike: number = 0; private tCode: number = 0;
  private tHeading: number = 0; private tQuote: number = 0;
  private tBullet: number = 0; private tOrdered: number = 0;
  private tTask: number = 0; private tCodeblock: number = 0;
  private tLink: number = 0; private tImage: number = 0;
  private tTable: number = 0; private tHr: number = 0;
  private tEdit: number = 0; private tSplit: number = 0;
  private tPreview: number = 0; private tWysiwyg: number = 0;
  private tUndo: number = 0; private tRedo: number = 0;
  private tExport: number = 0;

  private i18n: I18n = I18n.getInstance();

  private core: EditorCore | null = null;

  aboutToAppear(): void {
    this.core = this.editor.getCore();
  }

  // ── 内联 button helper（模板方法，消除重复代码）──

  private hoverEnter(timerRef: number, setPop: () => void): number {
    if (timerRef !== 0) clearTimeout(timerRef);
    return setTimeout(() => { setPop(); }, 500);
  }

  private hoverLeave(timerRef: number, clearPop: () => void): number {
    if (timerRef !== 0) clearTimeout(timerRef);
    clearPop();
    return 0;
  }

  private get isMarkdown(): boolean {
    if (!this.core) return true;
    return this.core.state.editorType === EditorType.Markdown;
  }

  private get viewMode(): ViewMode {
    if (!this.core) return ViewMode.Split;
    return this.core.state.viewMode;
  }

  private get isEditActive(): boolean {
    return this.isMarkdown && this.viewMode === ViewMode.Editor;
  }
  private get isSplitActive(): boolean {
    return this.viewMode === ViewMode.Split;
  }
  private get isPreviewActive(): boolean {
    return this.viewMode === ViewMode.Preview;
  }
  private get isWysiwygActive(): boolean {
    if (!this.core) return false;
    return this.core.state.editorType === EditorType.Wysiwyg;
  }

  // ═══════════════════════════════════════════════════════════
  //  build() — 所有按钮内联（bindPopup 规则）
  // ═══════════════════════════════════════════════════════════

  build() {
    Row() {
      // ── B 粗体 ──
      Button({ type: ButtonType.Normal }) { Text('B').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Bold'); })
        .bindPopup(this.hBold, { message: this.i18n.get('Bold'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tBold = this.hoverEnter(this.tBold, () => { this.hBold = true; }); }
          else { this.tBold = this.hoverLeave(this.tBold, () => { this.hBold = false; }); }
        })

      // ── I 斜体 ──
      Button({ type: ButtonType.Normal }) { Text('I').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Italic'); })
        .bindPopup(this.hItalic, { message: this.i18n.get('Italic'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tItalic = this.hoverEnter(this.tItalic, () => { this.hItalic = true; }); }
          else { this.tItalic = this.hoverLeave(this.tItalic, () => { this.hItalic = false; }); }
        })

      // ── S 删除线 ──
      Button({ type: ButtonType.Normal }) { Text('S').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Strike'); })
        .bindPopup(this.hStrike, { message: this.i18n.get('Strike'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tStrike = this.hoverEnter(this.tStrike, () => { this.hStrike = true; }); }
          else { this.tStrike = this.hoverLeave(this.tStrike, () => { this.hStrike = false; }); }
        })

      // ── <> 行内代码 ──
      Button({ type: ButtonType.Normal }) { Text('<>').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Code'); })
        .bindPopup(this.hCode, { message: this.i18n.get('Code'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tCode = this.hoverEnter(this.tCode, () => { this.hCode = true; }); }
          else { this.tCode = this.hoverLeave(this.tCode, () => { this.hCode = false; }); }
        })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── H 标题 ──
      Button({ type: ButtonType.Normal }) { Text('H').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Heading', '2'); })
        .bindPopup(this.hHeading, { message: this.i18n.get('Heading'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tHeading = this.hoverEnter(this.tHeading, () => { this.hHeading = true; }); }
          else { this.tHeading = this.hoverLeave(this.tHeading, () => { this.hHeading = false; }); }
        })

      // ── ❝ 引用 ──
      Button({ type: ButtonType.Normal }) { Text('❝').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Quote'); })
        .bindPopup(this.hQuote, { message: this.i18n.get('Quote'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tQuote = this.hoverEnter(this.tQuote, () => { this.hQuote = true; }); }
          else { this.tQuote = this.hoverLeave(this.tQuote, () => { this.hQuote = false; }); }
        })

      // ── • 无序列表 ──
      Button({ type: ButtonType.Normal }) { Text('•').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('BulletList'); })
        .bindPopup(this.hBullet, { message: this.i18n.get('BulletList'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tBullet = this.hoverEnter(this.tBullet, () => { this.hBullet = true; }); }
          else { this.tBullet = this.hoverLeave(this.tBullet, () => { this.hBullet = false; }); }
        })

      // ── 1. 有序列表 ──
      Button({ type: ButtonType.Normal }) { Text('1.').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('OrderedList'); })
        .bindPopup(this.hOrdered, { message: this.i18n.get('OrderedList'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tOrdered = this.hoverEnter(this.tOrdered, () => { this.hOrdered = true; }); }
          else { this.tOrdered = this.hoverLeave(this.tOrdered, () => { this.hOrdered = false; }); }
        })

      // ── ☑ 任务列表 ──
      Button({ type: ButtonType.Normal }) { Text('☑').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('TaskList'); })
        .bindPopup(this.hTask, { message: this.i18n.get('TaskList'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tTask = this.hoverEnter(this.tTask, () => { this.hTask = true; }); }
          else { this.tTask = this.hoverLeave(this.tTask, () => { this.hTask = false; }); }
        })

      // ── { } 代码块 ──
      Button({ type: ButtonType.Normal }) { Text('{ }').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('Codeblock'); })
        .bindPopup(this.hCodeblock, { message: this.i18n.get('Codeblock'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tCodeblock = this.hoverEnter(this.tCodeblock, () => { this.hCodeblock = true; }); }
          else { this.tCodeblock = this.hoverLeave(this.tCodeblock, () => { this.hCodeblock = false; }); }
        })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 🔗 链接 ──
      Button({ type: ButtonType.Normal }) { Text('🔗').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => {
          if (this.onLink) { this.onLink(); } else { this.editor.exec('Link'); }
        })
        .bindPopup(this.hLink, { message: this.i18n.get('Link'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tLink = this.hoverEnter(this.tLink, () => { this.hLink = true; }); }
          else { this.tLink = this.hoverLeave(this.tLink, () => { this.hLink = false; }); }
        })

      // ── 🖼 图片 ──
      Button({ type: ButtonType.Normal }) { Text('🖼').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => {
          if (this.onImage) { this.onImage(); } else { this.editor.exec('Image'); }
        })
        .bindPopup(this.hImage, { message: this.i18n.get('Image'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tImage = this.hoverEnter(this.tImage, () => { this.hImage = true; }); }
          else { this.tImage = this.hoverLeave(this.tImage, () => { this.hImage = false; }); }
        })

      // ── ⊞ 表格 ──
      Button({ type: ButtonType.Normal }) { Text('⊞').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => {
          if (this.onTable) { this.onTable(); } else { this.editor.exec('Table'); }
        })
        .bindPopup(this.hTable, { message: this.i18n.get('Table'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tTable = this.hoverEnter(this.tTable, () => { this.hTable = true; }); }
          else { this.tTable = this.hoverLeave(this.tTable, () => { this.hTable = false; }); }
        })

      // ── — 分割线 ──
      Button({ type: ButtonType.Normal }) { Text('—').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.exec('HorizontalRule'); })
        .bindPopup(this.hHr, { message: this.i18n.get('HorizontalRule'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tHr = this.hoverEnter(this.tHr, () => { this.hHr = true; }); }
          else { this.tHr = this.hoverLeave(this.tHr, () => { this.hHr = false; }); }
        })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── ✎ 编辑模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('✎')
          .fontSize(14)
          .fontColor(this.isEditActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isEditActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isEditActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.changeMode(EditorType.Markdown); this.editor.changeViewMode(ViewMode.Editor); })
        .bindPopup(this.hEdit, { message: this.i18n.get('Markdown'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tEdit = this.hoverEnter(this.tEdit, () => { this.hEdit = true; }); }
          else { this.tEdit = this.hoverLeave(this.tEdit, () => { this.hEdit = false; }); }
        })

      // ── ⇔ 分屏模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('⇔')
          .fontSize(14)
          .fontColor(this.isSplitActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isSplitActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isSplitActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.changeViewMode(ViewMode.Split); })
        .bindPopup(this.hSplit, { message: this.i18n.get('ScrollSync'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tSplit = this.hoverEnter(this.tSplit, () => { this.hSplit = true; }); }
          else { this.tSplit = this.hoverLeave(this.tSplit, () => { this.hSplit = false; }); }
        })

      // ── ◎ 预览模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('◎')
          .fontSize(14)
          .fontColor(this.isPreviewActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isPreviewActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isPreviewActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.changeViewMode(ViewMode.Preview); })
        .bindPopup(this.hPreview, { message: this.i18n.get('Preview'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tPreview = this.hoverEnter(this.tPreview, () => { this.hPreview = true; }); }
          else { this.tPreview = this.hoverLeave(this.tPreview, () => { this.hPreview = false; }); }
        })

      // ── ≡ WYSIWYG ──
      Button({ type: ButtonType.Normal }) {
        Text('≡')
          .fontSize(14)
          .fontColor(this.isWysiwygActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isWysiwygActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isWysiwygActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.changeMode(EditorType.Wysiwyg); })
        .bindPopup(this.hWysiwyg, { message: this.i18n.get('WYSIWYG'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tWysiwyg = this.hoverEnter(this.tWysiwyg, () => { this.hWysiwyg = true; }); }
          else { this.tWysiwyg = this.hoverLeave(this.tWysiwyg, () => { this.hWysiwyg = false; }); }
        })

      Blank()

      // ── ↶ 撤销 ──
      Button({ type: ButtonType.Normal }) { Text('↶').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.undo(); })
        .bindPopup(this.hUndo, { message: this.i18n.get('Undo'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tUndo = this.hoverEnter(this.tUndo, () => { this.hUndo = true; }); }
          else { this.tUndo = this.hoverLeave(this.tUndo, () => { this.hUndo = false; }); }
        })

      // ── ↷ 重做 ──
      Button({ type: ButtonType.Normal }) { Text('↷').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4).margin({ left: 2, right: 2 })
        .onClick(() => { this.editor.redo(); })
        .bindPopup(this.hRedo, { message: this.i18n.get('Redo'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tRedo = this.hoverEnter(this.tRedo, () => { this.hRedo = true; }); }
          else { this.tRedo = this.hoverLeave(this.tRedo, () => { this.hRedo = false; }); }
        })

      // ── 导出 ──
      Button({ type: ButtonType.Normal }) {
        Text(this.i18n.get('Export')).fontSize(12).fontColor(this.themeColors.toolbarFg)
      }
        .height(28).padding({ left: 10, right: 10 })
        .backgroundColor(this.themeColors.toolbarBg)
        .borderRadius(4)
        .border({ width: 1, color: this.themeColors.borderColor })
        .margin({ left: 4 })
        .onClick(() => { if (this.onExport) this.onExport(); })
        .bindPopup(this.hExport, { message: this.i18n.get('Export'), placement: Placement.Top, showInSubWindow: true })
        .onHover((isHover: boolean) => {
          if (isHover) { this.tExport = this.hoverEnter(this.tExport, () => { this.hExport = true; }); }
          else { this.tExport = this.hoverLeave(this.tExport, () => { this.hExport = false; }); }
        })
    }
    .width('100%')
    .height(44)
    .padding({ left: 8, right: 8 })
    .backgroundColor(this.themeColors.toolbarBg)
    .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })
  }
}
