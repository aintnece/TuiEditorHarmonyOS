/**
 * Toolbar — 编辑器工具栏
 *
 * 对标 tui.editor 的 toolbar + toolbarItem 组件。
 * 22 个按钮，无 tooltip（tooltip 已移除，以避免 Stack 拦截点击事件）。
 */

import { Editor } from '../editor/Editor';
import { EditorCore } from '../editor/EditorCore';
import { EditorType, ViewMode } from '../editor/EditorType';
import { ThemeColors } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';
import { hilog } from '@kit.PerformanceAnalysisKit';

@Component
export struct Toolbar {
  @Prop editor: Editor | null = null;
  @Prop themeColors: ThemeColors = new ThemeColors();
  onExport?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onTable?: () => void;

  private i18n: I18n = I18n.getInstance();
  private core: EditorCore | null = null;

  aboutToAppear(): void {
    hilog.info(0x0000, 'TUIEditor', 'Toolbar.aboutToAppear — this.editor: ' + this.editor + ' type: ' + typeof this.editor);
    if (this.editor) {
      this.core = this.editor.getCore();
    }
  }

  aboutToDisappear(): void {
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
  //  build()
  // ═══════════════════════════════════════════════════════════

  build() {
    Row() {
      // ── B 粗体 ──
      Button({ type: ButtonType.Normal }) { Text('B').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { hilog.info(0x0000, 'TUIEditor', 'Toolbar Bold onClick — this.editor: ' + this.editor + ' isMarkdown: ' + this.isMarkdown); if (this.editor) { this.editor.exec('Bold'); } })
        .margin({ left: 2, right: 2 })

      // ── I 斜体 ──
      Button({ type: ButtonType.Normal }) { Text('I').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Italic'); } })
        .margin({ left: 2, right: 2 })

      // ── S 删除线 ──
      Button({ type: ButtonType.Normal }) { Text('S').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Strike'); } })
        .margin({ left: 2, right: 2 })

      // ── <> 行内代码 ──
      Button({ type: ButtonType.Normal }) { Text('<>').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Code'); } })
        .margin({ left: 2, right: 2 })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── H 标题 ──
      Button({ type: ButtonType.Normal }) { Text('H').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Heading', '2'); } })
        .margin({ left: 2, right: 2 })

      // ── ❝ 引用 ──
      Button({ type: ButtonType.Normal }) { Text('❝').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Quote'); } })
        .margin({ left: 2, right: 2 })

      // ── • 无序列表 ──
      Button({ type: ButtonType.Normal }) { Text('•').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('BulletList'); } })
        .margin({ left: 2, right: 2 })

      // ── 1. 有序列表 ──
      Button({ type: ButtonType.Normal }) { Text('1.').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('OrderedList'); } })
        .margin({ left: 2, right: 2 })

      // ── ☑ 任务列表 ──
      Button({ type: ButtonType.Normal }) { Text('☑').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('TaskList'); } })
        .margin({ left: 2, right: 2 })

      // ── { } 代码块 ──
      Button({ type: ButtonType.Normal }) { Text('{ }').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('Codeblock'); } })
        .margin({ left: 2, right: 2 })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 🔗 链接 ──
      Button({ type: ButtonType.Normal }) { Text('🔗').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onLink) { this.onLink(); } else if (this.editor) { this.editor.exec('Link'); }
        })
        .margin({ left: 2, right: 2 })

      // ── 🖼 图片 ──
      Button({ type: ButtonType.Normal }) { Text('🖼').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onImage) { this.onImage(); } else if (this.editor) { this.editor.exec('Image'); }
        })
        .margin({ left: 2, right: 2 })

      // ── ⊞ 表格 ──
      Button({ type: ButtonType.Normal }) { Text('⊞').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onTable) { this.onTable(); } else if (this.editor) { this.editor.exec('Table'); }
        })
        .margin({ left: 2, right: 2 })

      // ── — 分割线 ──
      Button({ type: ButtonType.Normal }) { Text('—').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.exec('HorizontalRule'); } })
        .margin({ left: 2, right: 2 })

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
        .borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.changeMode(EditorType.Markdown); this.editor.changeViewMode(ViewMode.Editor); } })
        .margin({ left: 2, right: 2 })

      // ── ⇔ 分屏模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('⇔')
          .fontSize(14)
          .fontColor(this.isSplitActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isSplitActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isSplitActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.changeViewMode(ViewMode.Split); } })
        .margin({ left: 2, right: 2 })

      // ── ◎ 预览模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('◎')
          .fontSize(14)
          .fontColor(this.isPreviewActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isPreviewActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isPreviewActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.changeViewMode(ViewMode.Preview); } })
        .margin({ left: 2, right: 2 })

      // ── ≡ WYSIWYG ──
      Button({ type: ButtonType.Normal }) {
        Text('≡')
          .fontSize(14)
          .fontColor(this.isWysiwygActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isWysiwygActive ? 700 : 400)
      }
        .width(32).height(32).padding(0)
        .backgroundColor(this.isWysiwygActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.changeMode(EditorType.Wysiwyg); } })
        .margin({ left: 2, right: 2 })

      Blank()

      // ── ↶ 撤销 ──
      Button({ type: ButtonType.Normal }) { Text('↶').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.undo(); } })
        .margin({ left: 2, right: 2 })

      // ── ↷ 重做 ──
      Button({ type: ButtonType.Normal }) { Text('↷').fontSize(14).fontColor(this.themeColors.toolbarFg) }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (this.editor) { this.editor.redo(); } })
        .margin({ left: 2, right: 2 })

      // ── 导出 ──
      Button({ type: ButtonType.Normal }) {
        Text(this.i18n.get('Export')).fontSize(12).fontColor(this.themeColors.toolbarFg)
      }
        .height(28).padding({ left: 10, right: 10 })
        .backgroundColor(this.themeColors.toolbarBg)
        .borderRadius(4)
        .border({ width: 1, color: this.themeColors.borderColor })
        .onClick(() => { if (this.onExport) this.onExport(); })
        .margin({ left: 4 })
    }
    .width('100%')
    .height(44)
    .padding({ left: 8, right: 8 })
    .backgroundColor(this.themeColors.toolbarBg)
    .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })
  }
}
