# Active Task

## Objective

实现 Phase 4.7：SidePanel + StatusBar + ExportSheet

## Context

Phase 4.6 (ContextMenu 右键菜单) 已完成，Bug 修复全部完成，诊断日志已清理。
编辑器核心功能就绪，现在需要补充三个外围 UI 组件：

1. **SidePanel** — 左侧文件浏览器侧栏 ✅
2. **StatusBar** — 底部状态栏 ✅
3. **ExportSheet** — 导出为 HTML 对话框 ✅

## Components

### 1. SidePanel（左侧文件浏览器）✅

对标 tui.editor 风格的文件管理侧栏。显示在编辑器左侧。

**功能需求**：
- 显示"最近文件"列表（从 EditorPage 传入文件列表）✅
- 支持点击文件名切换打开文件（通过 editorContext 更新内容）✅
- 新建文档按钮（onNewFile 回调）✅
- 折叠/展开切换（通过 visible prop + 外部 toggle 标签）✅
- 暗色/亮色主题适配（通过 @Prop themeColors）✅
- 侧栏宽度 200px ✅
- 搜索/过滤输入框 ✅
- 活跃文件高亮 ✅
- 模拟示例文件（README.md、学习笔记.md、开发指南.md、API 文档.md）✅

### 2. StatusBar（底部状态栏）✅

**功能需求**：
- 字数统计（字符数 + 词数）✅
- 光标位置：行号和列号 ✅
- Markdown 模式指示器：Markdown / WYSIWYG / 分屏预览 / 仅预览 ✅
- 高度 28px，固定在编辑器底部 ✅
- 数据通过 EditorCore 事件同步（change/caretChange/stateChange）✅
- 小号字体（11px），使用 editorPlaceholder 颜色 ✅
- 顶部 1px 分割线 ✅

### 3. ExportSheet（导出对话框）✅

**功能需求**：
- 触发：点击工具栏导出按钮 ✅
- 弹出居中对话框（半透明遮罩层）✅
- HTML 预览窗口（前 500 字符）✅
- 导出 HTML 按钮（含 KaTeX 内联选项）✅
- 复制到剪贴板按钮 ✅
- 选项：内联 KaTeX、内联 Prism.js ✅
- 点击遮罩层关闭 ✅

## Steps

- [x] Step 1: 创建 `SidePanel.ets` 组件 — 左侧文件浏览器
- [x] Step 2: 创建 `StatusBar.ets` 组件 — 底部状态栏
- [x] Step 3: 创建 `ExportSheet.ets` 组件 — 导出对话框
- [x] Step 4: 集成到 EditorPage（SidePanel + StatusBar + ExportSheet 在 build() 中）
- [ ] Step 5: Hermes 编译验证

## Files Changed

1. **新建**: `entry/src/main/ets/components/SidePanel.ets` — 左侧文件浏览侧栏 (200 lines)
2. **新建**: `entry/src/main/ets/components/StatusBar.ets` — 底部状态栏 (167 lines)
3. **新建**: `entry/src/main/ets/components/ExportSheet.ets` — 导出对话框 (260 lines)
4. **修改**: `entry/src/main/ets/pages/EditorPage.ets` — 集成三个组件：
   - 添加 imports (SidePanel, StatusBar, ExportSheet, ExportOptions)
   - 添加 @State 变量 (showSidePanel, showExportSheet)
   - 添加 handleExport/doExport 方法
   - 重构 build() 布局：Row(SidePanel + Column(Toolbar+Editor)) + StatusBar
   - 添加 ExportSheet overlay
   - 添加 SidePanel 折叠切换标签（侧栏隐藏时显示 `▶` 按钮）
   - 重连 Toolbar onExport 回调

## Checkpoint

**Status**: `ready_for_review`
**Assigned to**: Claude Code
**Next step**: Hermes 编译验证 (DevEco Studio)
