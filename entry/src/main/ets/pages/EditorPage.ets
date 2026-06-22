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
import { SidePanel } from '../components/SidePanel';
import { StatusBar } from '../components/StatusBar';
import { ExportSheet, ExportOptions } from '../components/ExportSheet';
import { MdEditor } from '../editor/markdown/MdEditor';
import { MdPreview } from '../editor/markdown/MdPreview';
import { editorContext } from '../editor/EditorContext';

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
  @State showSidePanel: boolean = true;
  @State showExportSheet: boolean = false;

  private i18n: I18n = I18n.getInstance();

  // ── 弹出对话框回调 ──

  /** 确认插入链接 */
  private confirmLink = (text: string, url: string): void => {
    this.showLinkEditor = false;
    if (editorContext.core) {
      const md: string = editorContext.core.getMarkdown();
      const pos: number = editorContext.core.state.selectionStart;
      const snippet: string = '[' + text + '](' + url + ')';
      const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
      editorContext.core.onContentChange(newMd);
    }
  };

  /** 确认插入图片 */
  private confirmImage = (alt: string, url: string): void => {
    this.showImageEditor = false;
    if (editorContext.core) {
      const md: string = editorContext.core.getMarkdown();
      const pos: number = editorContext.core.state.selectionStart;
      const snippet: string = '![' + alt + '](' + url + ')';
      const newMd: string = md.substring(0, pos) + snippet + md.substring(pos);
      editorContext.core.onContentChange(newMd);
    }
  };

  /** 处理表格操作 */
  private handleTableAction = (action: string): void => {
    this.showTableMenu = false;
    if (!editorContext.core) return;

    const md: string = editorContext.core.getMarkdown();
    const pos: number = editorContext.core.state.selectionStart;

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
      editorContext.core.onContentChange(newMd);
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
      editorContext.core.onContentChange(newMd);
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
    if (!editorContext.core) return '';
    const md: string = editorContext.core.getMarkdown();
    const start: number = editorContext.core.state.selectionStart;
    const end: number = editorContext.core.state.selectionEnd;
    if (start >= end) return '';
    return md.substring(start, end);
  }

  /** 处理上下文菜单操作 */
  private handleContextMenuAction = (action: ContextMenuAction): void => {
    this.showContextMenu = false;
    if (!editorContext.core) return;

    const md: string = editorContext.core.getMarkdown();
    const selStart: number = editorContext.core.state.selectionStart;
    const selEnd: number = editorContext.core.state.selectionEnd;
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
        editorContext.core.onContentChange(newMd);
      }
    } else if (action === ContextMenuAction.Paste) {
      // 从剪贴板粘贴
      try {
        const pb = pasteboard.getSystemPasteboard();
        pb.getData((err: Error, pasteData: pasteboard.PasteData) => {
          if (!err && pasteData) {
            const text: string = pasteData.getPrimaryText();
            if (text !== '') {
              const currentMd: string = editorContext.core ? editorContext.core.getMarkdown() : '';
              const cursor: number = editorContext.core ? editorContext.core.state.selectionStart : currentMd.length;
              const newMd: string = currentMd.substring(0, cursor) + text + currentMd.substring(cursor);
              if (editorContext.core) {
                editorContext.core.onContentChange(newMd);
              }
            }
          }
        });
      } catch (_e) {
        // 剪贴板不可用时静默失败
      }
    } else if (action === ContextMenuAction.SelectAll) {
      // 全选：设置选区覆盖全文
      editorContext.core.state.selectionStart = 0;
      editorContext.core.state.selectionEnd = md.length;
      const sel = editorContext.core.selection;
      if (sel) {
        sel.startOffset = 0;
        sel.endOffset = md.length;
      }
      editorContext.core.eventEmitter.emit('caretChange');
    } else if (action === ContextMenuAction.Undo) {
      editorContext.core.undo();
    } else if (action === ContextMenuAction.Redo) {
      editorContext.core.redo();
    }
  };

  /** 处理导出 */
  private handleExport = (): void => {
    this.showExportSheet = true;
  };

  /** 执行实际导出操作 */
  private doExport = (_options: ExportOptions): void => {
    if (!editorContext.core) return;
    // 获取 HTML 内容
    editorContext.core.getFullHTML();
    // Phase 8 补充：实际文件写入
    this.showExportSheet = false;
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

    editorContext.editor = Editor.factory(opts);
    editorContext.core = editorContext.editor.getCore();

    // 监听内容变更
    editorContext.editor.on('change', (): void => {
      if (editorContext.core) {
        this.content = editorContext.core.getMarkdown();
        this.canUndo = editorContext.core.commandManager.canUndo();
        this.canRedo = editorContext.core.commandManager.canRedo();
      }
    });

    // 监听状态变更
    editorContext.editor.on('stateChange', (): void => {
      if (editorContext.core) {
        this.editorType = editorContext.core.state.editorType;
        this.viewMode = editorContext.core.state.viewMode;
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
            if (editorContext.editor) {
              editorContext.editor.changeMode(EditorType.Markdown);
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
            if (editorContext.editor) {
              editorContext.editor.changeMode(EditorType.Wysiwyg);
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
            if (editorContext.editor) {
              editorContext.editor.toggleTheme();
            }
          })
      }
      .width('100%')
      .height(44)
      .padding({ left: 12, right: 8 })
      .backgroundColor(this.theme.toolbarBg)
      .border({ width: { bottom: 1 }, color: this.theme.borderColor })

      // ═══════════════════════════════════════════════════════
      //  内容区域：SidePanel + 编辑区
      // ═══════════════════════════════════════════════════════
      Row() {
        // 侧栏切换标签（侧栏隐藏时显示）
        if (!this.showSidePanel) {
          Column() {
            Button({ type: ButtonType.Normal }) {
              Text('▶')
                .fontSize(10)
                .fontColor(this.theme.sidebarFg)
            }
              .width(24).height(32).padding(0)
              .backgroundColor(this.theme.sidebarBg)
              .borderRadius(0)
              .onClick(() => { this.showSidePanel = true; })
          }
          .height('100%')
          .backgroundColor(this.theme.sidebarBg)
          .border({ width: { right: 1 }, color: this.theme.borderColor })
        }

        // 侧栏
        SidePanel({
          themeColors: this.theme,
          visible: this.showSidePanel,
          onToggleCollapse: () => {
            this.showSidePanel = false;
          },
          onFileSelect: (_path: string) => {
            // 文件切换处理 — SidePanel 内部已通过 editorContext 更新内容
          },
          onNewFile: () => {
            // Phase 8 补充：新建文件逻辑
          },
          onOpenFile: () => {
            // Phase 8 补充：打开文件逻辑
          }
        })

        // 编辑器主体列
        Column() {
          // ── 工具栏 ──
          if (editorContext.editor) {
            Toolbar({
              // editor reads from editorContext global singleton
              themeColors: this.theme,
              onExport: () => { this.handleExport(); },
              onLink: () => { this.showLinkEditor = true; },
              onImage: () => { this.showImageEditor = true; },
              onTable: () => { this.showTableMenu = !this.showTableMenu; }
            })
          }

          // ═══════════════════════════════════════════════════════
          //  编辑区域
          // ═══════════════════════════════════════════════════════
          if (this.editorType === EditorType.Markdown && editorContext.core) {
            if (this.viewMode === ViewMode.Split) {
              // ── 分屏模式：编辑 | 可拖拽分栏 | 预览 ──
              Row() {
                MdEditor({
                  // editorCore reads from editorContext global singleton
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
                  // editorCore reads from editorContext global singleton
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
                // editorCore reads from editorContext global singleton
                themeColors: this.theme,
                fontSize: 16
              })
                .width('100%')
                .layoutWeight(1)
            } else {
              // ── 仅编辑模式 ──
              MdEditor({
                // editorCore reads from editorContext global singleton
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
        .clip(false)
        .layoutWeight(1)
        .height('100%')
      }
      .clip(false)
      .layoutWeight(1)
      .width('100%')

      // ═══════════════════════════════════════════════════════
      //  底部状态栏
      // ═══════════════════════════════════════════════════════
      StatusBar({
        themeColors: this.theme
      })
    }
    .clip(false)
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

      // ═══════════════════════════════════════════════════════
      //  导出面板
      // ═══════════════════════════════════════════════════════
      ExportSheet({
        themeColors: this.theme,
        visible: this.showExportSheet,
        onClose: () => { this.showExportSheet = false; },
        onExport: this.doExport
      })
    }
    .width('100%')
    .height('100%')
  }
}
