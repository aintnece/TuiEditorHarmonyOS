/**
 * EditorType — 编辑器核心类型定义
 *
 * 对标 tui.editor 的 editorType.ts + editorOption.ts。
 * 统一定义编辑器的类型、模式、配置和运行时状态。
 * 使用 class 而非 interface，适配 ArkTS 严格模式（可直接用于 @State）。
 */

// ═══════════════════════════════════════════════════════════
//  基础枚举
// ═══════════════════════════════════════════════════════════

/** 编辑器模式 */
export enum EditorType {
  Markdown = 'markdown',
  Wysiwyg = 'wysiwyg',
}

/** 视图模式 */
export enum ViewMode {
  Editor = 'editor',     // 仅编辑区
  Preview = 'preview',   // 仅预览区
  Split = 'split',       // 分栏（编辑 + 预览）
}

/** 预览样式 */
export enum PreviewStyle {
  Tab = 'tab',
  Vertical = 'vertical',
}

/** 事件类型（扩展 EventEmitter 的 EditorEvent） */
export enum EditorEventType {
  Load = 'load',
  Change = 'change',
  CaretChange = 'caretChange',
  Focus = 'focus',
  Blur = 'blur',
  Keydown = 'keydown',
  Keyup = 'keyup',
  BeforePreviewRender = 'beforePreviewRender',
  BeforeConvertWysiwygToMarkdown = 'beforeConvertWysiwygToMarkdown',
  BeforeConvertMarkdownToWysiwyg = 'beforeConvertMarkdownToWysiwyg',
  LoadUI = 'loadUI',
  StateChange = 'stateChange',
  Destroy = 'destroy',
}

// ═══════════════════════════════════════════════════════════
//  配置类
// ═══════════════════════════════════════════════════════════

/** 编辑器构造配置 — 对标 tui.editor options */
export class EditorConfig {
  // 内容
  initialValue: string = '';
  initialEditType: EditorType = EditorType.Markdown;

  // 视图
  previewStyle: PreviewStyle = PreviewStyle.Vertical;
  viewMode: ViewMode = ViewMode.Split;
  height: string = '100%';
  minHeight: string = '300px';

  // 主题
  theme: string = 'light';
  useDarkTheme: boolean = false;

  // 语言
  language: string = 'zh-CN';

  // 功能开关
  useCommandShortcut: boolean = true;
  useDefaultHTMLSanitizer: boolean = true;
  hideModeSwitch: boolean = false;
  useSyntaxHighlight: boolean = true;
  frontMatter: boolean = false;

  // 工具栏
  toolbarItems: String[] = [];

  // 插件
  plugins: Object[] = [];

  // 预览
  previewHighlight: boolean = true;
  customConvertor: Object | null = null;

  // 提示占位
  placeholder: string = '开始编辑…';

  // 自动聚焦
  autofocus: boolean = true;

  // 只读（Viewer 模式）
  viewer: boolean = false;

  /** 从传入的选项合并默认值（显式逐字段，禁止 spread） */
  static create(opts?: PartialConfig): EditorConfig {
    const config: EditorConfig = new EditorConfig();
    if (!opts) return config;

    if (opts.initialValue) config.initialValue = opts.initialValue;
    if (opts.initialEditType) config.initialEditType = opts.initialEditType;
    if (opts.previewStyle) config.previewStyle = opts.previewStyle;
    if (opts.viewMode) config.viewMode = opts.viewMode;
    if (opts.height) config.height = opts.height;
    if (opts.minHeight) config.minHeight = opts.minHeight;
    if (opts.theme) config.theme = opts.theme;
    if (opts.useDarkTheme !== undefined) config.useDarkTheme = opts.useDarkTheme;
    if (opts.language) config.language = opts.language;
    if (opts.useCommandShortcut !== undefined) config.useCommandShortcut = opts.useCommandShortcut;
    if (opts.useDefaultHTMLSanitizer !== undefined) config.useDefaultHTMLSanitizer = opts.useDefaultHTMLSanitizer;
    if (opts.hideModeSwitch !== undefined) config.hideModeSwitch = opts.hideModeSwitch;
    if (opts.useSyntaxHighlight !== undefined) config.useSyntaxHighlight = opts.useSyntaxHighlight;
    if (opts.frontMatter !== undefined) config.frontMatter = opts.frontMatter;
    if (opts.toolbarItems) config.toolbarItems = opts.toolbarItems;
    if (opts.plugins) config.plugins = opts.plugins;
    if (opts.previewHighlight !== undefined) config.previewHighlight = opts.previewHighlight;
    if (opts.placeholder) config.placeholder = opts.placeholder;
    if (opts.autofocus !== undefined) config.autofocus = opts.autofocus;
    if (opts.viewer !== undefined) config.viewer = opts.viewer;

    return config;
  }
}

/** 部分配置（构造时可省略字段） */
export class PartialConfig {
  initialValue?: string;
  initialEditType?: EditorType;
  previewStyle?: PreviewStyle;
  viewMode?: ViewMode;
  height?: string;
  minHeight?: string;
  theme?: string;
  useDarkTheme?: boolean;
  language?: string;
  useCommandShortcut?: boolean;
  useDefaultHTMLSanitizer?: boolean;
  hideModeSwitch?: boolean;
  useSyntaxHighlight?: boolean;
  frontMatter?: boolean;
  toolbarItems?: String[];
  plugins?: Object[];
  previewHighlight?: boolean;
  customConvertor?: Object;
  placeholder?: string;
  autofocus?: boolean;
  viewer?: boolean;
}

// ═══════════════════════════════════════════════════════════
//  运行时状态
// ═══════════════════════════════════════════════════════════

/** 编辑器运行时状态 */
export class EditorState {
  // 内容
  markdown: string = '';
  wysiwygHtml: string = '';

  // 模式
  editorType: EditorType = EditorType.Markdown;
  viewMode: ViewMode = ViewMode.Split;

  // 选区
  selectionStart: number = 0;
  selectionEnd: number = 0;
  /** 上一次有效选区（有范围，非光标），用于工具栏按钮点击时选区丢失的回退 */
  lastSelectionStart: number = -1;
  lastSelectionEnd: number = -1;

  // 状态
  isDirty: boolean = false;
  isFocused: boolean = false;
  isLoading: boolean = false;

  // 光标
  cursorLine: number = 0;
  cursorCol: number = 0;

  // 文件
  fileName: string = '未命名.md';
  filePath: string = '';

  /** 快照（用于命令撤销） */
  snapshot(): EditorState {
    const s: EditorState = new EditorState();
    s.markdown = this.markdown;
    s.wysiwygHtml = this.wysiwygHtml;
    s.editorType = this.editorType;
    s.viewMode = this.viewMode;
    s.selectionStart = this.selectionStart;
    s.selectionEnd = this.selectionEnd;
    s.lastSelectionStart = this.lastSelectionStart;
    s.lastSelectionEnd = this.lastSelectionEnd;
    s.isDirty = this.isDirty;
    s.isFocused = this.isFocused;
    s.isLoading = this.isLoading;
    s.cursorLine = this.cursorLine;
    s.cursorCol = this.cursorCol;
    s.fileName = this.fileName;
    s.filePath = this.filePath;
    return s;
  }
}
