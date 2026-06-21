/**
 * EditorPage — 编辑器主页面
 *
 * 对标 tui.editor 的 editor.ts + editorCore.ts 合并入口。
 * 集成 Markdown 模式、WYSIWYG 模式、预览模式、工具栏、命令系统。
 * 使用 Editor 入口类管理所有子系统。
 */

import { router } from '@kit.ArkUI';
import { pasteboard } from '@kit.BasicServicesKit';
import { Editor } from '../editor/Editor';
import { EditorCore } from '../editor/EditorCore';
import { EditorType, ViewMode, EditorConfig, PartialConfig } from '../editor/EditorType';
import { ThemeService, ThemeColors } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';
import { Toolbar } from '../components/Toolbar';
import { Splitter } from '../components/Splitter';
import { LinkEditor } from '../components/LinkEditor';
import { ImageEditor } from '../components/ImageEditor';
import { PopupMenu, MenuItem, createTableMenuItemsZh } from '../components/PopupMenu';
import { ContextMenu, ContextMenuAction } from '../components/ContextMenu';
import { MdEditor } from '../editor/markdown/MdEditor';
import { MdPreview } from '../editor/markdown/MdPreview';

/** 路由参数 */
class NavData {
  filePath: string = '';
  fileName: string = '';
}

@Entry
@Component
struct EditorPage {
  @State private theme: ThemeColors = ThemeService.getInstance().getTheme();
  @State private editorType: EditorType = EditorType.Markdown;
  @State private viewMode: ViewMode = ViewMode.Split;
  @State private content: string = '# Hello TUI Editor\n\n开始编辑…';
  @State private fileName: string = '未命名.md';
  @State private canUndo: boolean = false;
  @State private canRedo: boolean = false;
  @State splitRatio: number = 0.5;
  @State containerWidth: number = 800;
  @State showLinkEditor: boolean = false;
  @State showImageEditor: boolean = false;
  @State showTableMenu: boolean = false;
  @State showContextMenu: boolean = false;
  @State contextMenuX: number = 0;
  @State contextMenuY: number = 0;

  private editor: Editor | null = null;
  private core: EditorCore | null = null;
  private i18n: I18n = I18n.getInstance();

  // ── 弹出对话框回调 ──

  /** 确认插入链接 */
  private confirmLink = (text: string, url: string): void => {
    this.showLinkEditor = false;
    if (this.core) {
      const md: string = this.core.getMarkdown();
      const pos: number = this.core.state.selectionStart;
      const snippet: string = '[' + text + '](' + url + ')';
      const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
      this.core.onContentChange(newMd);
    }
  };

  /** 确认插入图片 */
  private confirmImage = (alt: string, url: string): void => {
    this.showImageEditor = false;
    if (this.core) {
      const md: string = this.core.getMarkdown();
      const pos: number = this.core.state.selectionStart;
      const snippet: string = '![' + alt + '](' + url + ')';
      const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
      this.core.onContentChange(newMd);
    }
  };

  /** 处理表格操作 */
  private handleTableAction = (action: string): void => {
    this.showTableMenu = false;
    if (!this.core) return;

    const md: string = this.core.getMarkdown();
    const pos: number = this.core.state.selectionStart;

    // 查找当前光标所在的表格
    const tableStart: number = md.lastIndexOf('\n|', pos);
    const tableEnd: number = md.indexOf('\n\n', tableStart > 0 ? tableStart : 0);
    const hasTable: boolean = tableStart >= 0 && tableEnd > tableStart;

    if (!hasTable && action.indexOf('add') < 0 && action.indexOf('delete') < 0 && action.indexOf('align') < 0) {
      return;
    }

    let snippet: string = '';

    // 简化实现：在光标处插入或修改
    const prefixChar: string = (pos > 0 && md[pos - 1] !== '\n') ? '\n' : '';

    if (action === 'addRowAbove' || action === 'addRowBelow') {
      snippet = prefixChar + '| 新行 | 内容 | 内容 |\n';
    } else if (action === 'addColLeft' || action === 'addColRight') {
      snippet = '| 新列 ';
    } else if (action === 'deleteRow') {
      // 基本实现：找到光标所在行并删除该行
      const lineStart: number = pos > 0 ? md.lastIndexOf('\n', pos - 1) + 1 : 0;
      let lineEnd: number = md.indexOf('\n', pos);
      if (lineEnd < 0) lineEnd = md.length;
      const newMd: string = md.substring(0, lineStart) + md.substring(lineEnd + 1);
      this.core.onContentChange(newMd);
      return;
    } else if (action === 'deleteCol') {
      // TODO: Phase 5 (WYSIWYG mode) — column deletion requires full table parsing
      return;
    } else if (action === 'alignLeft') {
      // TODO: Phase 5 (WYSIWYG mode) — alignment requires separator-row modification
    } else if (action === 'alignCenter') {
      // TODO: Phase 5 (WYSIWYG mode) — alignment requires separator-row modification
    } else if (action === 'alignRight') {
      // TODO: Phase 5 (WYSIWYG mode) — alignment requires separator-row modification
    }

    if (snippet !== '') {
      const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
      this.core.onContentChange(newMd);
    }
  };

  /** 处理长按 — 显示上下文菜单 */
  private handleLongPress = (localX: number, localY: number): void => {
    // 坐标转换：TextArea 相对坐标 → Stack 相对坐标
    // 偏移量 = 标题栏(44) + 工具栏(~40) + 编辑器行内padding
    const titleBarH: number = 44;
    const toolbarH: number = 40;
    const contentPaddingTop: number = 0;
    const offsetY: number = titleBarH + toolbarH + contentPaddingTop;

    // 限制 X 不超出右边界（菜单宽 160 + 边距）
    const menuW: number = 160;
    const margin: number = 8;
    let x: number = localX;
    if (x + menuW + margin > this.containerWidth) {
      x = this.containerWidth - menuW - margin;
    }
    if (x < margin) {
      x = margin;
    }

    this.contextMenuX = x;
    this.contextMenuY = localY + offsetY;
    this.showContextMenu = true;
  };

  /** 获取当前选中的文本 */
  private getSelectedText(): string {
    if (!this.core) return '';
    const md: string = this.core.getMarkdown();
    const start: number = this.core.state.selectionStart;
    const end: number = this.core.state.selectionEnd;
    if (start >= end) return '';
    return md.substring(start, end);
  }

  /** 处理上下文菜单操作 */
  private handleContextMenuAction = (action: ContextMenuAction): void => {
    this.showContextMenu = false;
    if (!this.core) return;

    const md: string = this.core.getMarkdown();
    const selStart: number = this.core.state.selectionStart;
    const selEnd: number = this.core.state.selectionEnd;
    const self: EditorPage = this;

    if (action === ContextMenuAction.Copy) {
      // 复制选中文本到剪贴板
      const selected: string = this.getSelectedText();
      if (selected !== '') {
        try {
          const pb = pasteboard.getSystemPasteboard();
          const data = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, selected);
          pb.setData(data);
        } catch (_e) {
          // 剪贴板不可用时静默失败
        }
      }
    } else if (action === ContextMenuAction.Cut) {
      // 剪切：复制 + 删除选中文本
      const selected: string = this.getSelectedText();
      if (selected !== '') {
        try {
          const pb = pasteboard.getSystemPasteboard();
          const data = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, selected);
          pb.setData(data);
        } catch (_e) {
          // 剪贴板不可用时静默失败
        }
        const newMd: string = md.substring(0, selStart) + md.substring(selEnd);
        this.core.onContentChange(newMd);
      }
    } else if (action === ContextMenuAction.Paste) {
      // 从剪贴板粘贴
      try {
        const pb = pasteboard.getSystemPasteboard();
        pb.getData((err: Error, pasteData: pasteboard.PasteData) => {
          if (!err && pasteData) {
            const text: string = pasteData.getPrimaryText();
            if (text !== '') {
              const currentMd: string = self.core ? self.core.getMarkdown() : '';
              const cursor: number = self.core ? self.core.state.selectionStart : currentMd.length;
              const newMd: string = currentMd.substring(0, cursor) + text + currentMd.substring(cursor);
              if (self.core) {
                self.core.onContentChange(newMd);
              }
            }
          }
        });
      } catch (_e) {
        // 剪贴板不可用时静默失败
      }
    } else if (action === ContextMenuAction.SelectAll) {
      // 全选：设置选区覆盖全文
      this.core.state.selectionStart = 0;
      this.core.state.selectionEnd = md.length;
      const sel = this.core.selection;
      if (sel) {
        sel.startOffset = 0;
        sel.endOffset = md.length;
      }
      this.core.eventEmitter.emit('caretChange');
    } else if (action === ContextMenuAction.Undo) {
      this.core.undo();
    } else if (action === ContextMenuAction.Redo) {
      this.core.redo();
    }
  };

  aboutToAppear(): void {
    const data: NavData = router.getParams() as NavData;
    if (data && data.fileName) {
      this.fileName = data.fileName;
    }

    // 创建 Editor 实例
    const opts: PartialConfig = new PartialConfig();
    opts.initialValue = this.content;
    opts.initialEditType = EditorType.Markdown;
    opts.viewMode = ViewMode.Split;
    opts.useDarkTheme = false;
    opts.language = 'zh-CN';
    opts.placeholder = '开始编辑…';
    opts.autofocus = true;
    opts.hideModeSwitch = false;

    this.editor = Editor.factory(opts);
    this.core = this.editor.getCore();

    // 监听内容变更
    this.editor.on('change', (): void => {
      if (this.core) {
        this.content = this.core.getMarkdown();
        this.canUndo = this.core.commandManager.canUndo();
        this.canRedo = this.core.commandManager.canRedo();
      }
    });

    // 监听状态变更
    this.editor.on('stateChange', (): void => {
      if (this.core) {
        this.editorType = this.core.state.editorType;
        this.viewMode = this.core.state.viewMode;
      }
    });

    // 主题变化监听
    ThemeService.getInstance().onThemeChange((t: ThemeColors): void => {
      this.theme = t;
    });

    // 语言变化监听
    this.i18n.onLanguageChange((code: string): void => {
      // 重新渲染会触发 build() 更新
    });
  }

  build() {
    Stack() {
      Column() {
      // ═══════════════════════════════════════════════════════
      //  标题栏
      // ═══════════════════════════════════════════════════════
      Row() {
        Text(this.fileName)
          .fontSize(16)
          .fontWeight(600)
          .fontColor(this.theme.editorFg)
          .layoutWeight(1)

        // Markdown 模式按钮
        Button(this.i18n.get('Markdown'))
          .fontSize(13)
          .height(28)
          .padding({ left: 10, right: 10 })
          .backgroundColor(this.editorType === EditorType.Markdown
            ? this.theme.toolbarActive : this.theme.toolbarHover)
          .fontColor(this.editorType === EditorType.Markdown
            ? '#ffffff' : this.theme.toolbarFg)
          .borderRadius(4)
          .margin({ right: 4 })
          .onClick(() => {
            if (this.editor) {
              this.editor.changeMode(EditorType.Markdown);
            }
          })

        // WYSIWYG 模式按钮
        Button(this.i18n.get('WYSIWYG'))
          .fontSize(13)
          .height(28)
          .padding({ left: 10, right: 10 })
          .backgroundColor(this.editorType === EditorType.Wysiwyg
            ? this.theme.toolbarActive : this.theme.toolbarHover)
          .fontColor(this.editorType === EditorType.Wysiwyg
            ? '#ffffff' : this.theme.toolbarFg)
          .borderRadius(4)
          .margin({ right: 8 })
          .onClick(() => {
            if (this.editor) {
              this.editor.changeMode(EditorType.Wysiwyg);
            }
          })

        // 主题切换
        Button(this.theme.isDark ? '☀' : '🌙')
          .fontSize(16)
          .width(28).height(28)
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            ThemeService.getInstance().toggleTheme();
            this.theme = ThemeService.getInstance().getTheme();
            if (this.editor) {
              this.editor.toggleTheme();
            }
          })
      }
      .width('100%')
      .height(44)
      .padding({ left: 12, right: 8 })
      .backgroundColor(this.theme.toolbarBg)
      .border({ width: { bottom: 1 }, color: this.theme.borderColor })

      // ═══════════════════════════════════════════════════════
      //  工具栏（完整 bindPopup 版）
      // ═══════════════════════════════════════════════════════
      if (this.editor) {
        Toolbar({
          editor: this.editor,
          themeColors: this.theme,
          onExport: () => { /* Phase 4.7: ExportSheet */ },
          onLink: () => { this.showLinkEditor = true; },
          onImage: () => { this.showImageEditor = true; },
          onTable: () => { this.showTableMenu = !this.showTableMenu; }
        })
      }

      // ═══════════════════════════════════════════════════════
      //  编辑区域
      // ═══════════════════════════════════════════════════════
      if (this.editorType === EditorType.Markdown && this.core) {
        if (this.viewMode === ViewMode.Split) {
          // ── 分屏模式：编辑 | 可拖拽分栏 | 预览 ──
          Row() {
            MdEditor({
              editorCore: this.core,
              themeColors: this.theme,
              fontSize: 16,
              placeholder: this.i18n.get('Placeholder', '开始编辑…'),
              onLongPress: this.handleLongPress
            })
              .width(this.containerWidth * this.splitRatio - 3)
              .height('100%')

            Splitter({
              splitRatio: $splitRatio,
              containerWidth: this.containerWidth,
              themeColors: this.theme
            })

            MdPreview({
              editorCore: this.core,
              themeColors: this.theme,
              fontSize: 16
            })
              .width(this.containerWidth * (1 - this.splitRatio) - 3)
              .height('100%')
          }
          .width('100%')
          .layoutWeight(1)
          .onAreaChange((_old: Area, newArea: Area) => {
            if (newArea && newArea.width && newArea.width > 0) {
              this.containerWidth = Number(newArea.width);
            }
          })
        } else if (this.viewMode === ViewMode.Preview) {
          // ── 仅预览模式 ──
          MdPreview({
            editorCore: this.core,
            themeColors: this.theme,
            fontSize: 16
          })
            .width('100%')
            .layoutWeight(1)
        } else {
          // ── 仅编辑模式 ──
          MdEditor({
            editorCore: this.core,
            themeColors: this.theme,
            fontSize: 16,
            placeholder: this.i18n.get('Placeholder', '开始编辑…'),
            onLongPress: this.handleLongPress
          })
            .width('100%')
            .layoutWeight(1)
        }
      } else {
        // WYSIWYG 区域 — Phase 5 实现
        Text('[ WYSIWYG 模式 — Phase 5 实现 ]')
          .width('100%')
          .layoutWeight(1)
          .fontSize(16)
          .fontColor(this.theme.editorPlaceholder)
          .textAlign(TextAlign.Center)
          .backgroundColor(this.theme.editorBg)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.editorBg)

      // ═══════════════════════════════════════════════════════
      //  弹出层（对话框 + 菜单）
      // ═══════════════════════════════════════════════════════

      // 链接编辑弹窗 — 居中遮罩层
      if (this.showLinkEditor) {
        Stack({ alignContent: Alignment.Center }) {
          Column()
            .width('100%').height('100%')
            .backgroundColor('rgba(0,0,0,0.4)')
            .onClick(() => { this.showLinkEditor = false; })

          Column() {
            LinkEditor({
              linkText: '',
              linkUrl: '',
              themeColors: this.theme,
              onConfirm: this.confirmLink,
              onCancel: () => { this.showLinkEditor = false; }
            })
          }
          .width(340)
          .backgroundColor(this.theme.editorBg)
          .borderRadius(12)
          .shadow({ radius: 16, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 4 })
        }
        .width('100%').height('100%')
        .position({ x: 0, y: 0 })
      }

      // 图片插入弹窗
      if (this.showImageEditor) {
        Stack({ alignContent: Alignment.Center }) {
          Column()
            .width('100%').height('100%')
            .backgroundColor('rgba(0,0,0,0.4)')
            .onClick(() => { this.showImageEditor = false; })

          Column() {
            ImageEditor({
              imageUrl: '',
              altText: '',
              themeColors: this.theme,
              onConfirm: this.confirmImage,
              onCancel: () => { this.showImageEditor = false; }
            })
          }
          .width(340)
          .backgroundColor(this.theme.editorBg)
          .borderRadius(12)
          .shadow({ radius: 16, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 4 })
        }
        .width('100%').height('100%')
        .position({ x: 0, y: 0 })
      }

      // 表格操作菜单
      PopupMenu({
        visible: this.showTableMenu,
        title: '表格操作',
        themeColors: this.theme,
        items: createTableMenuItemsZh(),
        onAction: this.handleTableAction,
        onClose: () => { this.showTableMenu = false; }
      })

      // 上下文菜单（右键/长按）
      if (this.showContextMenu) {
        // 透明遮罩 — 点击外部关闭
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.Transparent)
          .onClick(() => { this.showContextMenu = false; })
      }

      ContextMenu({
        visible: this.showContextMenu,
        themeColors: this.theme,
        posX: this.contextMenuX,
        posY: this.contextMenuY,
        onAction: this.handleContextMenuAction,
        onClose: () => { this.showContextMenu = false; }
      })
    }
    .width('100%')
    .height('100%')
  }
}
