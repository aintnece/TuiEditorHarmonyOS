/**
 * Toolbar — 编辑器工具栏
 *
 * 对标 tui.editor 的 toolbar + toolbarItem 组件。
 * 22 个按钮使用 Stack + position() 内联 tooltip，
 * 替代 bindPopup（在 32px 按钮上已知问题：需要双击才能触发 onClick）。
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

  // ── 单个 hover 状态替代 22 个独立 @State ──
  @State hoveredButton: string = '';

  private i18n: I18n = I18n.getInstance();
  private core: EditorCore | null = null;

  aboutToAppear(): void {
    this.core = this.editor.getCore();
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

  // ── 内联 tooltip builder ──
  @Builder
  buildTooltip(label: string) {
    Text(label)
      .fontSize(11)
      .fontColor('#ffffff')
      .backgroundColor('#333333')
      .padding({ left: 6, right: 6, top: 3, bottom: 3 })
      .borderRadius(4)
      .position({ x: 0, y: -26 })
  }

  // ═══════════════════════════════════════════════════════════
  //  build() — 22 按钮全部改用 Stack + position tooltip
  // ═══════════════════════════════════════════════════════════

  build() {
    Row() {
      // ── B 粗体 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('B').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Bold'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'bold' : ''; })
        if (this.hoveredButton === 'bold') {
          this.buildTooltip(this.i18n.get('Bold'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── I 斜体 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('I').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Italic'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'italic' : ''; })
        if (this.hoveredButton === 'italic') {
          this.buildTooltip(this.i18n.get('Italic'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── S 删除线 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('S').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Strike'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'strike' : ''; })
        if (this.hoveredButton === 'strike') {
          this.buildTooltip(this.i18n.get('Strike'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── <> 行内代码 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('<>').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Code'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'code' : ''; })
        if (this.hoveredButton === 'code') {
          this.buildTooltip(this.i18n.get('Code'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── H 标题 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('H').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Heading', '2'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'heading' : ''; })
        if (this.hoveredButton === 'heading') {
          this.buildTooltip(this.i18n.get('Heading'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ❝ 引用 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('❝').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Quote'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'quote' : ''; })
        if (this.hoveredButton === 'quote') {
          this.buildTooltip(this.i18n.get('Quote'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── • 无序列表 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('•').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('BulletList'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'bullet' : ''; })
        if (this.hoveredButton === 'bullet') {
          this.buildTooltip(this.i18n.get('BulletList'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── 1. 有序列表 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('1.').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('OrderedList'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'ordered' : ''; })
        if (this.hoveredButton === 'ordered') {
          this.buildTooltip(this.i18n.get('OrderedList'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ☑ 任务列表 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('☑').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('TaskList'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'task' : ''; })
        if (this.hoveredButton === 'task') {
          this.buildTooltip(this.i18n.get('TaskList'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── { } 代码块 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('{ }').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('Codeblock'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'codeblock' : ''; })
        if (this.hoveredButton === 'codeblock') {
          this.buildTooltip(this.i18n.get('Codeblock'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 🔗 链接 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('🔗').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => {
            if (this.onLink) { this.onLink(); } else { this.editor.exec('Link'); }
          })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'link' : ''; })
        if (this.hoveredButton === 'link') {
          this.buildTooltip(this.i18n.get('Link'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── 🖼 图片 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('🖼').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => {
            if (this.onImage) { this.onImage(); } else { this.editor.exec('Image'); }
          })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'image' : ''; })
        if (this.hoveredButton === 'image') {
          this.buildTooltip(this.i18n.get('Image'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ⊞ 表格 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('⊞').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => {
            if (this.onTable) { this.onTable(); } else { this.editor.exec('Table'); }
          })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'table' : ''; })
        if (this.hoveredButton === 'table') {
          this.buildTooltip(this.i18n.get('Table'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── — 分割线 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('—').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.exec('HorizontalRule'); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'hr' : ''; })
        if (this.hoveredButton === 'hr') {
          this.buildTooltip(this.i18n.get('HorizontalRule'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── ✎ 编辑模式 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) {
          Text('✎')
            .fontSize(14)
            .fontColor(this.isEditActive ? '#ffffff' : this.themeColors.toolbarFg)
            .fontWeight(this.isEditActive ? 700 : 400)
        }
          .width(32).height(32).padding(0)
          .backgroundColor(this.isEditActive ? this.themeColors.toolbarActive : Color.Transparent)
          .borderRadius(4)
          .onClick(() => { this.editor.changeMode(EditorType.Markdown); this.editor.changeViewMode(ViewMode.Editor); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'edit' : ''; })
        if (this.hoveredButton === 'edit') {
          this.buildTooltip(this.i18n.get('Markdown'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ⇔ 分屏模式 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) {
          Text('⇔')
            .fontSize(14)
            .fontColor(this.isSplitActive ? '#ffffff' : this.themeColors.toolbarFg)
            .fontWeight(this.isSplitActive ? 700 : 400)
        }
          .width(32).height(32).padding(0)
          .backgroundColor(this.isSplitActive ? this.themeColors.toolbarActive : Color.Transparent)
          .borderRadius(4)
          .onClick(() => { this.editor.changeViewMode(ViewMode.Split); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'split' : ''; })
        if (this.hoveredButton === 'split') {
          this.buildTooltip(this.i18n.get('ScrollSync'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ◎ 预览模式 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) {
          Text('◎')
            .fontSize(14)
            .fontColor(this.isPreviewActive ? '#ffffff' : this.themeColors.toolbarFg)
            .fontWeight(this.isPreviewActive ? 700 : 400)
        }
          .width(32).height(32).padding(0)
          .backgroundColor(this.isPreviewActive ? this.themeColors.toolbarActive : Color.Transparent)
          .borderRadius(4)
          .onClick(() => { this.editor.changeViewMode(ViewMode.Preview); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'preview' : ''; })
        if (this.hoveredButton === 'preview') {
          this.buildTooltip(this.i18n.get('Preview'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ≡ WYSIWYG ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) {
          Text('≡')
            .fontSize(14)
            .fontColor(this.isWysiwygActive ? '#ffffff' : this.themeColors.toolbarFg)
            .fontWeight(this.isWysiwygActive ? 700 : 400)
        }
          .width(32).height(32).padding(0)
          .backgroundColor(this.isWysiwygActive ? this.themeColors.toolbarActive : Color.Transparent)
          .borderRadius(4)
          .onClick(() => { this.editor.changeMode(EditorType.Wysiwyg); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'wysiwyg' : ''; })
        if (this.hoveredButton === 'wysiwyg') {
          this.buildTooltip(this.i18n.get('WYSIWYG'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      Blank()

      // ── ↶ 撤销 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('↶').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.undo(); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'undo' : ''; })
        if (this.hoveredButton === 'undo') {
          this.buildTooltip(this.i18n.get('Undo'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── ↷ 重做 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) { Text('↷').fontSize(14).fontColor(this.themeColors.toolbarFg) }
          .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
          .onClick(() => { this.editor.redo(); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'redo' : ''; })
        if (this.hoveredButton === 'redo') {
          this.buildTooltip(this.i18n.get('Redo'))
        }
      }
      .width(32).height(32).margin({ left: 2, right: 2 }).clip(false)

      // ── 导出 ──
      Stack({ alignContent: Alignment.Top }) {
        Button({ type: ButtonType.Normal }) {
          Text(this.i18n.get('Export')).fontSize(12).fontColor(this.themeColors.toolbarFg)
        }
          .height(28).padding({ left: 10, right: 10 })
          .backgroundColor(this.themeColors.toolbarBg)
          .borderRadius(4)
          .border({ width: 1, color: this.themeColors.borderColor })
          .onClick(() => { if (this.onExport) this.onExport(); })
          .onHover((isHover: boolean) => { this.hoveredButton = isHover ? 'export' : ''; })
        if (this.hoveredButton === 'export') {
          this.buildTooltip(this.i18n.get('Export'))
        }
      }
      .height(28).margin({ left: 4 }).clip(false)
    }
    .width('100%')
    .height(44)
    .padding({ left: 8, right: 8 })
    .backgroundColor(this.themeColors.toolbarBg)
    .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })
  }
}
