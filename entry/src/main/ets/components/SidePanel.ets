/**
 * SidePanel — 左侧文件浏览侧栏
 *
 * 对标 tui.editor 风格的文件管理侧栏。
 * 显示在编辑器左侧，支持折叠/展开、文件选择、新建/打开。
 * 通过 editorContext 全局单例访问编辑器核心。
 * Phase 4.8: 接入 FileService，替换 mock 数据为真实文件系统读写。
 *
 * Redesigned: TUI Editor consistent style — clean layout,
 * Feather-inspired icons, no placeholder clipping.
 */

import { ThemeColors } from '../services/ThemeService';
import { editorContext } from '../editor/EditorContext';
import { FileItem, fileService } from '../services/FileService';

@Component
export struct SidePanel {
  @Prop themeColors: ThemeColors = new ThemeColors();
  @Prop visible: boolean = true;

  @State private fileList: FileItem[] = [];
  @State private activeFilePath: string = '';
  @State private searchQuery: string = '';
  @State private collapseHover: boolean = false;
  @State private newFileHover: boolean = false;

  /** 面板折叠回调 — 由父组件控制 visible */
  onToggleCollapse?: () => void;

  /** 选择文件回调 */
  onFileSelect?: (path: string) => void;
  /** 新建文件回调 */
  onNewFile?: (path: string) => void;
  /** 打开文件回调 */
  onOpenFile?: () => void;

  aboutToAppear(): void {
    this.loadFiles();
  }

  /** 从 FileService 加载文件列表 */
  private loadFiles(): void {
    this.fileList = fileService.listFiles();
    if (this.fileList.length > 0) {
      this.activeFilePath = this.fileList[0].path;
    }
  }

  /** 点击文件条目：读取内容并加载到编辑器 */
  private handleFileClick(item: FileItem): void {
    this.activeFilePath = item.path;
    const content: string = fileService.readFile(item.path);
    if (editorContext.core) {
      editorContext.core.setMarkdown(content);
    }
    if (this.onFileSelect) {
      this.onFileSelect(item.path);
    }
  }

  /** 获取过滤后的文件列表 */
  private getFilteredFiles(): FileItem[] {
    if (this.searchQuery === '') {
      return this.fileList;
    }
    const query: string = this.searchQuery.toLowerCase();
    const result: FileItem[] = [];
    for (let i = 0; i < this.fileList.length; i++) {
      const item: FileItem = this.fileList[i];
      if (item.name.toLowerCase().indexOf(query) >= 0) {
        result.push(item);
      }
    }
    return result;
  }

  build() {
    if (this.visible) {
      Column() {
        // ═══════════════════════════════════════════════════
        //  标题栏 — 38px, border-bottom
        // ═══════════════════════════════════════════════════
        Row() {
          Text('📁')
            .fontSize(14)
            .margin({ right: 6 })

          Text('文件浏览')
            .fontSize(13)
            .fontWeight(600)
            .fontColor(this.themeColors.sidebarFg)
            .layoutWeight(1)

          // 收起按钮
          Button({ type: ButtonType.Normal }) {
            Text('✕')
              .fontSize(13)
              .fontColor(this.themeColors.sidebarFg)
          }
            .width(28).height(28).padding(0)
            .backgroundColor(this.collapseHover ? this.themeColors.sidebarHover : Color.Transparent)
            .borderRadius(4)
            .onHover((isHover: boolean): void => {
              this.collapseHover = isHover;
            })
            .onClick(() => {
              if (this.onToggleCollapse) {
                this.onToggleCollapse();
              }
            })

          // 新建按钮
          Button({ type: ButtonType.Normal }) {
            Text('+')
              .fontSize(17)
              .fontColor(this.themeColors.sidebarFg)
          }
            .width(28).height(28).padding(0)
            .backgroundColor(this.newFileHover ? this.themeColors.sidebarHover : Color.Transparent)
            .borderRadius(4)
            .margin({ left: 2 })
            .onHover((isHover: boolean): void => {
              this.newFileHover = isHover;
            })
            .onClick(() => {
              // 通过 fileService 创建新文件
              const baseDir: string = fileService.getBaseDir();
              const defaultName: string = '新建文档.md';
              const newPath: string | null = fileService.createFile(baseDir, defaultName);
              if (newPath !== null) {
                // 刷新文件列表并选中新文件
                this.loadFiles();
                this.activeFilePath = newPath;
                const content: string = fileService.readFile(newPath);
                if (editorContext.core) {
                  editorContext.core.setMarkdown(content);
                }
                if (this.onNewFile) {
                  this.onNewFile(newPath);
                }
              }
            })
        }
        .width('100%')
        .height(38)
        .padding({ left: 10, right: 8 })
        .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })

        // ═══════════════════════════════════════════════════
        //  搜索框 — 36px, bg=sidebarHover
        // ═══════════════════════════════════════════════════
        Row() {
          Text('🔍')
            .fontSize(13)
            .margin({ left: 10, right: 6 })
            .opacity(0.6)

          TextInput({ placeholder: '搜索文件…', text: $$this.searchQuery })
            .fontSize(13)
            .height(36)
            .layoutWeight(1)
            .backgroundColor(Color.Transparent)
            .borderRadius(0)
            .padding({ top: 0, bottom: 0, left: 0, right: 8 })
            .placeholderColor(this.themeColors.editorPlaceholder)
        }
        .width('100%')
        .height(36)
        .backgroundColor(this.themeColors.sidebarHover)
        .borderRadius(6)
        .margin({ left: 6, right: 6, top: 6, bottom: 6 })

        // ═══════════════════════════════════════════════════
        //  文件列表 — 32px items
        // ═══════════════════════════════════════════════════
        Scroll() {
          Column() {
            ForEach(this.getFilteredFiles(), (item: FileItem) => {
              Row() {
                Text('📄')
                  .fontSize(14)
                  .margin({ right: 8 })

                Text(item.name)
                  .fontSize(13)
                  .fontColor(this.themeColors.sidebarFg)
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .height(32)
              .padding({ left: 12, right: 12 })
              .borderRadius(4)
              .backgroundColor(item.path === this.activeFilePath
                ? this.themeColors.sidebarActive : Color.Transparent)
              .onClick(() => {
                this.handleFileClick(item);
              })
            }, (item: FileItem) => item.path)
          }
          .width('100%')
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
      .width(200)
      .height('100%')
      .backgroundColor(this.themeColors.sidebarBg)
      .border({ width: { right: 1 }, color: this.themeColors.borderColor })
    }
  }
}
