/**
 * EditorCore — 编辑器核心协调器
 *
 * 对标 tui.editor 的 editorCore.ts。
 * 持有并协调所有子系统：EventEmitter、SpecManager、CommandManager、
 * ToastMark（解析器）、HtmlRenderer、ThemeService、I18n。
 */

import { EventEmitter, Handler } from '../event/EventEmitter';
import { CommandManager } from './commands/CommandManager';
import { SpecManager } from '../spec/SpecManager';
import { ToastMark } from '../parser/ToastMark';
import { HtmlRenderer } from '../parser/html/Renderer';
import { ThemeService, ThemeColors } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';
import { Selection } from './selection/Selection';
import {
  EditorType, ViewMode, EditorConfig, EditorState,
} from './EditorType';
import { getBuiltinCommands } from './commands/commands/MarkdownCommands';

export class EditorCore {
  // ── 子系统 ──
  eventEmitter: EventEmitter = new EventEmitter();
  commandManager: CommandManager = new CommandManager();
  specManager: SpecManager = SpecManager.getInstance();
  parser: ToastMark = new ToastMark();
  renderer: HtmlRenderer;
  themeService: ThemeService = ThemeService.getInstance();
  i18n: I18n = I18n.getInstance();

  // ── 运行时状态 ──
  state: EditorState = new EditorState();
  config: EditorConfig;

  // ── 选区模型 ──
  selection: Selection | null = null;

  // ── 生命周期标志 ──
  private destroyed: boolean = false;

  constructor(config: EditorConfig) {
    this.config = config;
    this.state.markdown = config.initialValue;
    this.state.editorType = config.initialEditType;
    this.state.viewMode = config.viewMode;

    // 初始化渲染器
    this.renderer = new HtmlRenderer({
      darkMode: config.useDarkTheme,
      fontSize: 16,
    });

    // 注册所有内置命令
    this.registerBuiltinCommands();

    // 同步 I18n 语言
    this.i18n.setCode(config.language);
  }

  // ── 公共 API ──

  /** 获取当前 Markdown 内容 */
  getMarkdown(): string {
    return this.state.markdown;
  }

  /** 设置 Markdown 内容 */
  setMarkdown(md: string): void {
    this.state.markdown = md;
    this.state.isDirty = true;
    this.eventEmitter.emit('change');
  }

  /** 获取渲染后的 HTML */
  getHTML(): string {
    const ast = this.parser.parse(this.state.markdown);
    return this.renderer.renderBody(ast);
  }

  /** 获取完整 HTML 页面 */
  getFullHTML(): string {
    const ast = this.parser.parse(this.state.markdown);
    return this.renderer.renderFullPage(ast);
  }

  /** 切换编辑模式 */
  changeMode(mode: EditorType): void {
    if (this.state.editorType === mode) return;
    this.state.editorType = mode;
    this.eventEmitter.emit('stateChange');
  }

  /** 切换视图模式 */
  changeViewMode(mode: ViewMode): void {
    if (this.state.viewMode === mode) return;
    this.state.viewMode = mode;
    this.eventEmitter.emit('stateChange');
  }

  /** 执行命令 */
  exec(name: string, ...args: string[]): EditorState | null {
    const result: EditorState | null = this.commandManager.execute(name, this.state, ...args);
    if (result) {
      this.state = result;
      this.eventEmitter.emit('change');
    }
    return result;
  }

  /** 撤销 */
  undo(): boolean {
    const prev: EditorState | null = this.commandManager.undo(this.state);
    if (prev) {
      this.state = prev;
      this.eventEmitter.emit('change');
      return true;
    }
    return false;
  }

  /** 重做 */
  redo(): boolean {
    const next: EditorState | null = this.commandManager.redo(this.state);
    if (next) {
      this.state = next;
      this.eventEmitter.emit('change');
      return true;
    }
    return false;
  }

  /** 更新选区（从 TextArea 光标回调） */
  updateSelection(selStart: number, selEnd: number): void {
    // Save last valid selection (with range) as fallback for toolbar button clicks
    // that cause TextArea to lose focus and fire (0,0) before onClick executes
    if (selStart < selEnd) {
      this.state.lastSelectionStart = selStart;
      this.state.lastSelectionEnd = selEnd;
    }
    this.state.selectionStart = selStart;
    this.state.selectionEnd = selEnd;
    this.selection = Selection.fromTextArea(this.state.markdown, selStart, selEnd);
    this.state.cursorLine = this.selection.startLine;
    this.state.cursorCol = this.selection.startCol;
    this.eventEmitter.emit('caretChange');
  }

  /** 内容变更回调（从 TextArea onChange） */
  onContentChange(text: string): void {
    this.state.markdown = text;
    this.state.isDirty = true;
    this.eventEmitter.emit('change');
  }

  /** 聚焦 */
  focus(): void {
    this.state.isFocused = true;
    this.eventEmitter.emit('focus');
  }

  /** 失焦 */
  blur(): void {
    this.state.isFocused = false;
    this.eventEmitter.emit('blur');
  }

  /** 添加事件监听 */
  on(eventName: string, handler: Handler): void {
    this.eventEmitter.on(eventName, handler);
  }

  /** 移除事件监听 */
  off(eventName: string, handler: Handler): void {
    this.eventEmitter.off(eventName, handler);
  }

  /** 获取当前主题 */
  getTheme(): ThemeColors {
    return this.themeService.getTheme();
  }

  /** 切换主题 */
  toggleTheme(): void {
    this.themeService.toggleTheme();
    // 更新渲染器
    const newTheme: ThemeColors = this.themeService.getTheme();
    this.renderer = new HtmlRenderer({
      darkMode: newTheme.isDark,
      fontSize: 16,
    });
    this.eventEmitter.emit('stateChange');
  }

  /** 销毁编辑器 */
  destroy(): void {
    this.destroyed = true;
    this.eventEmitter.emit('destroy');
    this.eventEmitter.clear();
    this.commandManager.clearHistory();
  }

  /** 是否已销毁 */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  // ── 私有 ──

  private registerBuiltinCommands(): void {
    const cmds = getBuiltinCommands();
    for (let i = 0; i < cmds.length; i++) {
      this.commandManager.register(cmds[i]);
    }
  }
}
