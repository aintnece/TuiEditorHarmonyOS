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
import { editorContext } from '../editor/EditorContext';

@Component
export struct Toolbar {
  @Prop themeColors: ThemeColors = new ThemeColors();
  onSave?: () => void;
  onExport?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onTable?: () => void;
  @State hoveredTip: string = '';

  private i18n: I18n = I18n.getInstance();

  aboutToAppear(): void {
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
  //  @Builder iconBtn — 图标按钮 + hover 中文 tooltip
  // ═══════════════════════════════════════════════════════════

  @Builder
  iconBtn(media: Resource, tip: string, action: () => void) {
    Button({ type: ButtonType.Normal }) {
      Image(media).width(16).height(16)
    }
    .width(32).height(32).padding(0)
    .backgroundColor(this.hoveredTip === tip ? this.themeColors.toolbarHover : Color.Transparent)
    .borderRadius(4)
    .onClick(action)
    .onHover((isHover: boolean): void => {
      if (isHover) {
        this.hoveredTip = tip;
      } else if (this.hoveredTip === tip) {
        this.hoveredTip = "";
      }
    })
    .bindPopup(this.hoveredTip === tip, {
      message: tip,
      placement: Placement.Bottom,
      mask: false
    })
    .margin({ left: 2, right: 2 })
  }

  // ═══════════════════════════════════════════════════════════
  //  @Builder headingBtn — 标题下拉菜单按钮
  //  (照搬 iconBtn 视觉，但用 bindMenu 替换 onClick)
  // ═══════════════════════════════════════════════════════════

  @Builder
  headingBtn() {
    Button({ type: ButtonType.Normal }) {
      Image($r('app.media.tui_heading')).width(16).height(16)
    }
    .width(32).height(32).padding(0)
    .backgroundColor(this.hoveredTip === '标题' ? this.themeColors.toolbarHover : Color.Transparent)
    .borderRadius(4)
    .onHover((isHover: boolean): void => {
      if (isHover) {
        this.hoveredTip = '标题';
      } else if (this.hoveredTip === '标题') {
        this.hoveredTip = '';
      }
    })
    .bindPopup(this.hoveredTip === '标题', {
      message: '标题',
      placement: Placement.Bottom,
      mask: false
    })
    .bindMenu(this.headingMenu)
    .margin({ left: 2, right: 2 })
  }

  @Builder
  headingMenu() {
    Menu() {
      MenuItem({ content: '标题 1', labelInfo: 'H1' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '1'); } })
      MenuItem({ content: '标题 2', labelInfo: 'H2' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '2'); } })
      MenuItem({ content: '标题 3', labelInfo: 'H3' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '3'); } })
      MenuItem({ content: '标题 4', labelInfo: 'H4' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '4'); } })
      MenuItem({ content: '标题 5', labelInfo: 'H5' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '5'); } })
      MenuItem({ content: '标题 6', labelInfo: 'H6' })
        .onClick((): void => { if (editorContext.editor) { editorContext.editor.exec('Heading', '6'); } })
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  build()
  // ═══════════════════════════════════════════════════════════

  build() {
    Row() {
      // ── 粗体 ──
      this.iconBtn($r('app.media.tui_bold'), '加粗', () => { if (editorContext.editor) { editorContext.editor.exec('Bold'); } })

      // ── 斜体 ──
      this.iconBtn($r('app.media.tui_italic'), '斜体', () => { if (editorContext.editor) { editorContext.editor.exec('Italic'); } })

      // ── 删除线 ──
      this.iconBtn($r('app.media.tui_strike'), '删除线', () => { if (editorContext.editor) { editorContext.editor.exec('Strike'); } })

      // ── 行内代码 ──
      this.iconBtn($r('app.media.tui_code'), '行内代码', () => { if (editorContext.editor) { editorContext.editor.exec('Code'); } })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 标题 ──
      this.headingBtn()

      // ── 引用 ──
      this.iconBtn($r('app.media.tui_quote'), '引用', () => { if (editorContext.editor) { editorContext.editor.exec('Quote'); } })

      // ── 无序列表 ──
      this.iconBtn($r('app.media.tui_bullet'), '无序列表', () => { if (editorContext.editor) { editorContext.editor.exec('BulletList'); } })

      // ── 有序列表 ──
      this.iconBtn($r('app.media.tui_ordered'), '有序列表', () => { if (editorContext.editor) { editorContext.editor.exec('OrderedList'); } })

      // ── 任务列表 ──
      this.iconBtn($r('app.media.tui_task'), '任务列表', () => { if (editorContext.editor) { editorContext.editor.exec('TaskList'); } })

      // ── 代码块 ──
      this.iconBtn($r('app.media.tui_codeblock'), '代码块', () => { if (editorContext.editor) { editorContext.editor.exec('Codeblock'); } })

      // ── 缩进 ──
      this.iconBtn($r('app.media.tui_indent'), '缩进', () => { if (editorContext.editor) { editorContext.editor.exec('Indent'); } })
      // ── 减少缩进 ──
      this.iconBtn($r('app.media.tui_outdent'), '减少缩进', () => { if (editorContext.editor) { editorContext.editor.exec('Outdent'); } })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 链接 ──
      this.iconBtn($r('app.media.tui_link'), '链接', () => {
        if (this.onLink) { this.onLink(); } else if (editorContext.editor) { editorContext.editor.exec('Link'); }
      })

      // ── 图片 ──
      this.iconBtn($r('app.media.tui_image'), '图片', () => {
        if (this.onImage) { this.onImage(); } else if (editorContext.editor) { editorContext.editor.exec('Image'); }
      })

      // ── 表格 ──
      this.iconBtn($r('app.media.tui_table'), '表格', () => {
        if (this.onTable) { this.onTable(); } else if (editorContext.editor) { editorContext.editor.exec('Table'); }
      })

      // ── 分割线 ──
      this.iconBtn($r('app.media.tui_hr'), '分割线', () => { if (editorContext.editor) { editorContext.editor.exec('HorizontalRule'); } })

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
      this.iconBtn($r('app.media.tui_undo'), '撤销', () => { if (editorContext.editor) { editorContext.editor.undo(); } })

      // ── 重做 ──
      this.iconBtn($r('app.media.tui_redo'), '重做', () => { if (editorContext.editor) { editorContext.editor.redo(); } })

      Divider().vertical(true).height(20).width(1).color(this.themeColors.borderColor).margin({ left: 4, right: 4 })

      // ── 保存 ──
      this.iconBtn($r('app.media.tui_save'), '保存', () => { if (this.onSave) this.onSave(); })

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
    .clip(false)
  }
}
