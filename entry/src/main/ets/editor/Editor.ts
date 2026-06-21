/**
 * Editor — 编辑器主入口类
 *
 * 对标 tui.editor 的 editor.ts（Editor.factory()）。
 * 提供统一的 Editor 工厂方法、API 门面。
 * 调用方使用 Editor.factory(options) 创建实例。
 */

import { EditorCore } from './EditorCore';
import { EditorConfig, EditorType, ViewMode, PartialConfig } from './EditorType';
import { ThemeService } from '../services/ThemeService';
import { I18n } from '../i18n/I18n';
import { Handler } from '../event/EventEmitter';
import { common } from '@kit.AbilityKit';

export class Editor {
  private core: EditorCore;

  private constructor(config: EditorConfig) {
    this.core = new EditorCore(config);
  }

  /**
   * 工厂方法 — 对标 tui.editor 的 Editor.factory()。
   * 创建并返回 Editor 实例。
   */
  static factory(options?: PartialConfig): Editor {
    const config: EditorConfig = EditorConfig.create(options);
    return new Editor(config);
  }

  // ── 公共 API ──

  /** 获取当前 Markdown 文本 */
  getMarkdown(): string {
    return this.core.getMarkdown();
  }

  /** 设置 Markdown 文本 */
  setMarkdown(md: string): void {
    this.core.setMarkdown(md);
  }

  /** 获取渲染后的 HTML */
  getHTML(): string {
    return this.core.getHTML();
  }

  /** 获取完整 HTML 页面 */
  getFullHTML(): string {
    return this.core.getFullHTML();
  }

  /** 切换编辑模式 */
  changeMode(mode: EditorType): void {
    this.core.changeMode(mode);
  }

  /** 切换视图模式 */
  changeViewMode(mode: ViewMode): void {
    this.core.changeViewMode(mode);
  }

  /** 执行命令 */
  exec(name: string, ...args: string[]): boolean {
    const result = this.core.exec(name, ...args);
    return result !== null;
  }

  /** 撤销 */
  undo(): boolean {
    return this.core.undo();
  }

  /** 重做 */
  redo(): boolean {
    return this.core.redo();
  }

  /** 聚焦 */
  focus(): void {
    this.core.focus();
  }

  /** 失焦 */
  blur(): void {
    this.core.blur();
  }

  /** 切换主题 */
  toggleTheme(): void {
    this.core.toggleTheme();
  }

  /** 初始化偏好存储（需在 UIAbility onCreate 中调用） */
  initPreferences(context: common.Context): void {
    ThemeService.getInstance().init(context);
    I18n.getInstance().init(context);
  }

  /** 获取事件发射器（用于 UI 层绑定） */
  getEventEmitter() {
    return this.core.eventEmitter;
  }

  /** 获取 EditorCore 实例（供 UI 组件直接调用） */
  getCore(): EditorCore {
    return this.core;
  }

  /** 销毁 */
  destroy(): void {
    this.core.destroy();
  }

  /** 监听事件 */
  on(eventName: string, handler: Handler): void {
    this.core.on(eventName, handler);
  }

  /** 移除监听 */
  off(eventName: string, handler: Handler): void {
    this.core.off(eventName, handler);
  }
}
