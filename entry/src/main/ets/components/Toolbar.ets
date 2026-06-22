/**
 * Toolbar — 编辑器工具栏
 *
 * 对标 tui.editor 的 toolbar + toolbarItem 组件。
 * 22 个按钮，图标化带中文标签。
 */

import { Editor } from '../editor/Editor';
import { EditorCore } from '../editor/EditorCore';
import { EditorType, ViewMode } from '../editor/EditorType';
import { ThemeColors } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { editorContext } from '../editor/EditorContext';

@Component
export struct Toolbar {
  @Prop themeColors: ThemeColors = new ThemeColors();
  onExport?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onTable?: () => void;

  private i18n: I18n = I18n.getInstance();

  aboutToAppear(): void {
    hilog.info(0x0000, 'TUIEditor', 'Toolbar.aboutToAppear — editorContext.editor: ' + editorContext.editor + ' type: ' + typeof editorContext.editor);
  }

  aboutToDisappear(): void {
  }

  private get isMarkdown(): boolean {
    if (!editorContext.core) return true;
    return editorContext.core.state.editorType === EditorType.Markdown;
  }

  private get viewMode(): ViewMode {
    if (!editorContext.core) return ViewMode.Split;
    return editorContext.core.state.viewMode;
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
    if (!editorContext.core) return false;
    return editorContext.core.state.editorType === EditorType.Wysiwyg;
  }

  // ═══════════════════════════════════════════════════════════
  //  build()
  // ═══════════════════════════════════════════════════════════

  build() {
    Row() {
      // ── 粗体 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_bold'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { hilog.info(0x0000, 'TUIEditor', 'Toolbar Bold onClick — editorContext.editor: ' + editorContext.editor + ' isMarkdown: ' + this.isMarkdown); hilog.info(0x0000, 'TUIEditor', 'Toolbar Bold — core:' + editorContext.core + ' coreIsNull:' + (editorContext.core === null)); if (editorContext.editor) { editorContext.editor.exec('Bold'); } })
        .margin({ left: 2, right: 2 })

      // ── 斜体 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_italic'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Italic'); } })
        .margin({ left: 2, right: 2 })

      // ── 删除线 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_strike'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Strike'); } })
        .margin({ left: 2, right: 2 })

      // ── 行内代码 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_code'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Code'); } })
        .margin({ left: 2, right: 2 })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 标题 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_heading'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Heading', '2'); } })
        .margin({ left: 2, right: 2 })

      // ── 引用 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_quote'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Quote'); } })
        .margin({ left: 2, right: 2 })

      // ── 无序列表 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_bullet'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('BulletList'); } })
        .margin({ left: 2, right: 2 })

      // ── 有序列表 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_ordered'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('OrderedList'); } })
        .margin({ left: 2, right: 2 })

      // ── 任务列表 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_task'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('TaskList'); } })
        .margin({ left: 2, right: 2 })

      // ── 代码块 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_codeblock'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('Codeblock'); } })
        .margin({ left: 2, right: 2 })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 链接 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_link'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onLink) { this.onLink(); } else if (editorContext.editor) { editorContext.editor.exec('Link'); }
        })
        .margin({ left: 2, right: 2 })

      // ── 图片 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_image'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onImage) { this.onImage(); } else if (editorContext.editor) { editorContext.editor.exec('Image'); }
        })
        .margin({ left: 2, right: 2 })

      // ── 表格 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_table'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => {
          if (this.onTable) { this.onTable(); } else if (editorContext.editor) { editorContext.editor.exec('Table'); }
        })
        .margin({ left: 2, right: 2 })

      // ── 分割线 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_hr'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.exec('HorizontalRule'); } })
        .margin({ left: 2, right: 2 })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 编辑模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('编辑')
          .fontSize(11)
          .fontColor(this.isEditActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isEditActive ? 700 : 400)
      }
        .width(40).height(32).padding(0)
        .backgroundColor(this.isEditActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.changeMode(EditorType.Markdown); editorContext.editor.changeViewMode(ViewMode.Editor); } })
        .margin({ left: 2, right: 2 })

      // ── 分屏模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('分屏')
          .fontSize(11)
          .fontColor(this.isSplitActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isSplitActive ? 700 : 400)
      }
        .width(40).height(32).padding(0)
        .backgroundColor(this.isSplitActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.changeViewMode(ViewMode.Split); } })
        .margin({ left: 2, right: 2 })

      // ── 预览模式 ──
      Button({ type: ButtonType.Normal }) {
        Text('预览')
          .fontSize(11)
          .fontColor(this.isPreviewActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isPreviewActive ? 700 : 400)
      }
        .width(40).height(32).padding(0)
        .backgroundColor(this.isPreviewActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.changeViewMode(ViewMode.Preview); } })
        .margin({ left: 2, right: 2 })

      // ── WYSIWYG ──
      Button({ type: ButtonType.Normal }) {
        Text('所见即所得')
          .fontSize(10)
          .fontColor(this.isWysiwygActive ? '#ffffff' : this.themeColors.toolbarFg)
          .fontWeight(this.isWysiwygActive ? 700 : 400)
      }
        .width(64).height(32).padding(0)
        .backgroundColor(this.isWysiwygActive ? this.themeColors.toolbarActive : Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.changeMode(EditorType.Wysiwyg); } })
        .margin({ left: 2, right: 2 })

      Blank()

      // ── 撤销 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_undo'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.undo(); } })
        .margin({ left: 2, right: 2 })

      // ── 重做 ──
      Button({ type: ButtonType.Normal }) {
        Image($r('app.media.tui_redo'))
          .width(16).height(16)
          .fillColor(this.themeColors.toolbarFg)
      }
        .width(32).height(32).padding(0).backgroundColor(Color.Transparent).borderRadius(4)
        .onClick(() => { if (editorContext.editor) { editorContext.editor.redo(); } })
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
