/**
 * SidePanel — 左侧文件浏览侧栏
 *
 * 对标 tui.editor 风格的文件管理侧栏。
 * 显示在编辑器左侧，支持折叠/展开、文件选择、新建/打开。
 * 通过 editorContext 全局单例访问编辑器核心。
 */

import { ThemeColors } from '../services/ThemeService';
import { editorContext } from '../editor/EditorContext';

/** 文件条目 */
class FileItem {
  path: string = '';
  name: string = '';
  icon: string = '📄';
}

@Component
export struct SidePanel {
  @Prop themeColors: ThemeColors = new ThemeColors();
  @Prop visible: boolean = true;

  @State private fileList: FileItem[] = [];
  @State private activeFilePath: string = '';
  @State private searchQuery: string = '';

  /** 面板折叠回调 — 由父组件控制 visible */
  onToggleCollapse?: () => void;

  /** 选择文件回调 */
  onFileSelect?: (path: string) => void;
  /** 新建文件回调 */
  onNewFile?: () => void;
  /** 打开文件回调 */
  onOpenFile?: () => void;

  aboutToAppear(): void {
    this.loadMockFiles();
  }

  private loadMockFiles(): void {
    const items: FileItem[] = [];

    const f1: FileItem = new FileItem();
    f1.path = '/documents/readme.md';
    f1.name = 'README.md';
    f1.icon = '📄';
    items.push(f1);

    const f2: FileItem = new FileItem();
    f2.path = '/documents/notes.md';
    f2.name = '学习笔记.md';
    f2.icon = '📄';
    items.push(f2);

    const f3: FileItem = new FileItem();
    f3.path = '/documents/guide.md';
    f3.name = '开发指南.md';
    f3.icon = '📄';
    items.push(f3);

    const f4: FileItem = new FileItem();
    f4.path = '/documents/api.md';
    f4.name = 'API 文档.md';
    f4.icon = '📄';
    items.push(f4);

    this.fileList = items;
    if (items.length > 0) {
      this.activeFilePath = items[0].path;
    }
  }

  private handleFileClick(item: FileItem): void {
    this.activeFilePath = item.path;
    // 切换到对应文件的模拟内容
    const mockContent: string = this.getMockContent(item.name);
    if (editorContext.core) {
      editorContext.core.setMarkdown(mockContent);
    }
    if (this.onFileSelect) {
      this.onFileSelect(item.path);
    }
  }

  private getMockContent(fileName: string): string {
    if (fileName === 'README.md') {
      return '# README\n\n欢迎使用 TUI Editor！\n\n这是一个基于 TOAST UI Editor v3.2.2 的鸿蒙原生编辑器。\n\n## 功能\n\n- Markdown 编辑\n- 实时预览\n- 工具栏支持\n- 主题切换';
    }
    if (fileName === '学习笔记.md') {
      return '# 学习笔记\n\n## ArkTS 开发\n\nArkTS 是 HarmonyOS 的主力开发语言。\n\n### 严格模式\n\n- 禁止 `any` 类型\n- 禁止对象字面量\n- 禁止展开运算符\n\n### 组件通信\n\n- `@Prop` 父传子\n- `@Link` 双向绑定\n- `@State` 组件内状态';
    }
    if (fileName === '开发指南.md') {
      return '# 开发指南\n\n## 快速开始\n\n```bash\nhdc shell\n./start.sh\n```\n\n## 项目结构\n\n- entry/ — 主模块\n- components/ — UI 组件\n- editor/ — 编辑器核心';
    }
    if (fileName === 'API 文档.md') {
      return '# API 文档\n\n## Editor.factory()\n\n创建编辑器实例。\n\n### 参数\n\n| 参数 | 类型 | 说明 |\n|------|------|------|\n| opts | PartialConfig | 配置选项 |\n\n### 返回值\n\n返回 `Editor` 实例。';
    }
    return '# 新建文档\n\n开始编辑…';
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
      // ── 展开状态：完整面板（父组件通过 visible 控制显隐，EditorPage 的 ▶ 按钮控制折叠）──
      Column() {
        // ── 标题栏 ──
        Row() {
          // 图标 + 标题
          Text('📁')
            .fontSize(14)
            .margin({ right: 6 })

          Text('文件浏览')
            .fontSize(13)
            .fontWeight(600)
            .fontColor(this.themeColors.sidebarFg)
            .layoutWeight(1)

          // 收起按钮 — ← 箭头（通知父组件切换 visible）
          Button({ type: ButtonType.Normal }) {
            Text('←')
              .fontSize(14)
              .fontColor(this.themeColors.sidebarFg)
          }
            .width(24).height(24).padding(0)
            .backgroundColor(Color.Transparent)
            .borderRadius(4)
            .margin({ right: 2 })
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
            .width(24).height(24).padding(0)
            .backgroundColor(Color.Transparent)
            .borderRadius(4)
            .onClick(() => {
              if (this.onNewFile) {
                this.onNewFile();
              }
            })
        }
        .width('100%')
        .height(38)
        .padding({ left: 10, right: 8 })
        .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })
        .clip(false)

        // ── 搜索框 ──
        Row() {
          Text('🔍')
            .fontSize(12)
            .margin({ left: 8, right: 4 })
            .opacity(0.5)

          TextInput({ placeholder: '搜索文件…', text: $$this.searchQuery })
            .fontSize(12)
            .height(28)
            .layoutWeight(1)
            .backgroundColor(Color.Transparent)
            .borderRadius(0)
            .padding({ left: 0, right: 8 })
            .placeholderColor(this.themeColors.editorPlaceholder)
        }
        .width('100%')
        .height(42)
        .padding({ left: 4, right: 8 })
        .backgroundColor(this.themeColors.sidebarHover)
        .borderRadius(6)
        .margin({ left: 8, right: 8, top: 8, bottom: 8 })
        .clip(false)

        // ── 文件列表 ──
        Scroll() {
          Column() {
            ForEach(this.getFilteredFiles(), (item: FileItem) => {
              Row() {
                Text(item.icon)
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
              .height(34)
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
      .clip(false)
    }
  }
}
