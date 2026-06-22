# Active Task

## Objective

实现 Phase 4.7：SidePanel + StatusBar + ExportSheet

## Context

Phase 4.6 (ContextMenu 右键菜单) 已完成，Bug 修复全部完成，诊断日志已清理。
编辑器核心功能就绪，现在需要补充三个外围 UI 组件：

1. **SidePanel** — 左侧文件浏览器侧栏
2. **StatusBar** — 底部状态栏
3. **ExportSheet** — 导出为 HTML 对话框

## Components

### 1. SidePanel（左侧文件浏览器）

对标 tui.editor 风格的文件管理侧栏。显示在编辑器左侧。

**功能需求**：
- 显示"最近文件"列表（从 EditorPage 传入文件列表）
- 支持点击文件名切换打开文件（回调 `onFileSelect`）
- 新建文档按钮（回调 `onNewFile`）
- 删除文件按钮（三态：打开 → 确认 → 执行）
- 重命名文件（点击当前文件名 → TextInput 内联编辑 → 回车确认）
- 折叠/展开切换（toggle 按钮 → 动画宽度变化）
- 暗色/亮色主题适配（通过 `@Prop themeColors`）
- 侧栏宽度约 220px

**组件接口**：
```typescript
@Component
export struct SidePanel {
  @Prop themeColors: ThemeColors;
  @Prop visible: boolean = true;
  files: string[] = [];        // 文件路径列表
  activeFile: string = '';     // 当前活跃文件
  onFileSelect?: (path: string) => void;
  onNewFile?: () => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}
```

**设计要点**：
- 文件列表用 `List` + `ForEach` 渲染
- 活跃文件高亮（左侧蓝色竖条 + 背景色）
- 搜索/过滤输入框（顶部）
- 空状态提示："暂无文件，点击 + 新建"
- 文件图标：📄 普通文件，🖼 图片，📊 表格

### 2. StatusBar（底部状态栏）

对标 tui.editor 的 statusbar，显示编辑器元信息。

**功能需求**：
- 字数统计（中/英分开：`中文 N 字 · 英文 M words`）
- 光标位置：`行 12, 列 5`
- Markdown 模式指示器：`Markdown` / `WYSIWYG` / `分屏预览` / `仅预览`
- 语法高亮模式指示（可选，Phase 8）
- 高度约 28px，固定在编辑器底部

**组件接口**：
```typescript
@Component
export struct StatusBar {
  @Prop themeColors: ThemeColors;
  @Prop wordCount: number = 0;
  @Prop cursorLine: number = 0;
  @Prop cursorCol: number = 0;
  @Prop editorType: EditorType = EditorType.Markdown;
  @Prop viewMode: ViewMode = ViewMode.Split;
}
```

**设计要点**：
- `Row` 布局：wordCount | cursor | mode（用 `Blank()` 间隔）
- 小号字体（11px-12px），低对比度颜色
- 顶部 1px 分割线
- 数据从 EditorCore 通过事件同步（监听 change/caretChange/stateChange）

### 3. ExportSheet（导出对话框）

对标 tui.editor 的导出功能。将 Markdown 渲染为完整 HTML 文件。

**功能需求**：
- 触发：点击 Toolbar 导出按钮（`onExport` 回调）
- 弹出居中对话框（半透明遮罩层）
- 预览窗口：显示渲染后的 HTML 预览（用 WebView，80% 宽度）
- 导出按钮：点击后生成 HTML 字符串并写入文件
- 选项：
  - ☑ 内联 KaTeX（数学公式渲染）
  - ☑ 内联 Prism.js（代码语法高亮）
  - ☐ 独立 CSS 文件
- 导出路径：`/data/storage/el2/base/files/exports/文件名.html`
- 导出成功后显示 Toast："导出成功: /path/to/file.html"

**组件接口**：
```typescript
@Component
export struct ExportSheet {
  @Prop themeColors: ThemeColors;
  @Prop visible: boolean = false;
  onClose?: () => void;
  onExport?: (options: ExportOptions) => void;
}

interface ExportOptions {
  inlineKatex: boolean;
  inlinePrism: boolean;
  externalCss: boolean;
}
```

**实现步骤**：
1. 创建 ExportSheet.ets 组件
2. 从 EditorCore 获取 HTML（`editorContext.core.getFullHTML()`）
3. 注入 KaTeX CDN 资源（或内联 CSS/JS）
4. 注入 Prism.js CDN 资源（或内联 CSS/JS）
5. 使用 `fileIo.writeSync` 写入文件
6. 使用 `promptAction.showToast` 显示结果

**已知问题**：Prism.js rawfile 资源需提前准备（或先跳过，Phase 8 补充）

## Steps

- [ ] Step 1: 创建 `SidePanel.ets` 组件 — 左侧文件浏览器
- [ ] Step 2: 创建 `StatusBar.ets` 组件 — 底部状态栏
- [ ] Step 3: 创建 `ExportSheet.ets` 组件 — 导出对话框
- [ ] Step 4: 集成到 EditorPage（SidePanel + StatusBar + ExportSheet 在 build() 中）
- [ ] Step 5: Hermes 编译验证

## Checkpoint

**Status**: `pending`
**Assigned to**: Claude Code
**Next step**: CC 读取 CLAUDE.md → 读取鸿蒙开发文档 → 开始 Step 1 SidePanel
