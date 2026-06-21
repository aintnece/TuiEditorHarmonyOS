/**
 * ThemeService — 主题管理
 *
 * 对标 tui.editor 的 light/dark 主题切换。
 * 提供统一的颜色配置，颜色 Token 对齐 tui.editor CSS 变量体系。
 * 支持偏好持久化（通过 @kit.ArkData preferences）。
 */

import { preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
}

/** 主题颜色配置 — 对标 tui.editor CSS 变量 */
export class ThemeColors {
  mode: ThemeMode = ThemeMode.Light;
  isDark: boolean = false;

  // ── 编辑器 (Editor) ──
  editorBg: string = '#ffffff';
  editorFg: string = '#24292e';
  editorCursor: string = '#0366d6';
  editorSelection: string = '#c8e1ff';
  editorLineNumber: string = '#959da5';
  editorGutter: string = '#f6f8fa';
  editorActiveLine: string = '#f8f9fa';
  editorPlaceholder: string = '#959da5';

  // ── 预览 (Preview) ──
  previewBg: string = '#ffffff';
  previewFg: string = '#24292e';
  previewCodeBg: string = '#f6f8fa';
  previewBlockquoteBg: string = '#f6f8fa';
  previewBlockquoteBorder: string = '#0366d6';
  previewTableBorder: string = '#dfe2e5';
  previewTableStripe: string = '#f6f8fa';
  previewLinkColor: string = '#0366d6';

  // ── 工具栏 (Toolbar) ──
  toolbarBg: string = '#f6f8fa';
  toolbarFg: string = '#24292e';
  toolbarActive: string = '#0366d6';
  toolbarHover: string = '#e1e4e8';
  toolbarDivider: string = '#dfe2e5';
  toolbarDisabled: string = '#959da5';

  // ── 侧栏 (Sidebar) ──
  sidebarBg: string = '#f6f8fa';
  sidebarFg: string = '#24292e';
  sidebarActive: string = '#e1e4e8';
  sidebarHover: string = '#f0f1f3';

  // ── 弹出层 (Popup) ──
  popupBg: string = '#ffffff';
  popupFg: string = '#24292e';
  popupBorder: string = '#dfe2e5';
  popupShadow: string = 'rgba(0,0,0,0.1)';

  // ── 通用 ──
  borderColor: string = '#dfe2e5';
  scrollbarThumb: string = '#c1c1c1';
  scrollbarTrack: string = '#f1f1f1';
  errorColor: string = '#d73a49';

  /** 从另一个 ThemeColors 复制所有字段 */
  copyFrom(other: ThemeColors): void {
    this.mode = other.mode;
    this.isDark = other.isDark;
    this.editorBg = other.editorBg;
    this.editorFg = other.editorFg;
    this.editorCursor = other.editorCursor;
    this.editorSelection = other.editorSelection;
    this.editorLineNumber = other.editorLineNumber;
    this.editorGutter = other.editorGutter;
    this.editorActiveLine = other.editorActiveLine;
    this.editorPlaceholder = other.editorPlaceholder;
    this.previewBg = other.previewBg;
    this.previewFg = other.previewFg;
    this.previewCodeBg = other.previewCodeBg;
    this.previewBlockquoteBg = other.previewBlockquoteBg;
    this.previewBlockquoteBorder = other.previewBlockquoteBorder;
    this.previewTableBorder = other.previewTableBorder;
    this.previewTableStripe = other.previewTableStripe;
    this.previewLinkColor = other.previewLinkColor;
    this.toolbarBg = other.toolbarBg;
    this.toolbarFg = other.toolbarFg;
    this.toolbarActive = other.toolbarActive;
    this.toolbarHover = other.toolbarHover;
    this.toolbarDivider = other.toolbarDivider;
    this.toolbarDisabled = other.toolbarDisabled;
    this.sidebarBg = other.sidebarBg;
    this.sidebarFg = other.sidebarFg;
    this.sidebarActive = other.sidebarActive;
    this.sidebarHover = other.sidebarHover;
    this.popupBg = other.popupBg;
    this.popupFg = other.popupFg;
    this.popupBorder = other.popupBorder;
    this.popupShadow = other.popupShadow;
    this.borderColor = other.borderColor;
    this.scrollbarThumb = other.scrollbarThumb;
    this.scrollbarTrack = other.scrollbarTrack;
    this.errorColor = other.errorColor;
  }
}

/** 浅色主题 */
const LightTheme: ThemeColors = new ThemeColors();
// 所有默认值即浅色主题，无需额外赋值

/** 深色主题 */
const DarkTheme: ThemeColors = new ThemeColors();
DarkTheme.mode = ThemeMode.Dark;
DarkTheme.isDark = true;
DarkTheme.editorBg = '#1e1e1e';
DarkTheme.editorFg = '#d4d4d4';
DarkTheme.editorCursor = '#569cd6';
DarkTheme.editorSelection = '#264f78';
DarkTheme.editorLineNumber = '#858585';
DarkTheme.editorGutter = '#252526';
DarkTheme.editorActiveLine = '#2a2d2e';
DarkTheme.editorPlaceholder = '#6a737d';
DarkTheme.previewBg = '#1e1e1e';
DarkTheme.previewFg = '#d4d4d4';
DarkTheme.previewCodeBg = '#2d2d2d';
DarkTheme.previewBlockquoteBg = '#252525';
DarkTheme.previewBlockquoteBorder = '#569cd6';
DarkTheme.previewTableBorder = '#404040';
DarkTheme.previewTableStripe = '#252526';
DarkTheme.previewLinkColor = '#569cd6';
DarkTheme.toolbarBg = '#252526';
DarkTheme.toolbarFg = '#cccccc';
DarkTheme.toolbarActive = '#569cd6';
DarkTheme.toolbarHover = '#3e3e42';
DarkTheme.toolbarDivider = '#404040';
DarkTheme.toolbarDisabled = '#6a737d';
DarkTheme.sidebarBg = '#252526';
DarkTheme.sidebarFg = '#cccccc';
DarkTheme.sidebarActive = '#37373d';
DarkTheme.sidebarHover = '#2a2d2e';
DarkTheme.popupBg = '#2d2d2d';
DarkTheme.popupFg = '#cccccc';
DarkTheme.popupBorder = '#404040';
DarkTheme.popupShadow = 'rgba(0,0,0,0.4)';
DarkTheme.borderColor = '#404040';
DarkTheme.scrollbarThumb = '#424242';
DarkTheme.scrollbarTrack = '#2d2d2d';
DarkTheme.errorColor = '#f85149';

const PREF_NAME: string = 'editor_theme';
const PREF_KEY: string = 'theme_mode';

export class ThemeService {
  private static instance: ThemeService | null = null;
  private currentTheme: ThemeColors = new ThemeColors();
  private themeChangeListeners: ThemeChangeListener[] = [];

  // 偏好存储实例（需外部调用 init() 初始化）
  private prefs: preferences.Preferences | null = null;

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private constructor() {
    // 默认浅色，等 init() 后再加载持久化值
    this.currentTheme.copyFrom(LightTheme);
  }

  /**
   * 初始化偏好存储（由 UIAbility 的 onCreate 调用）。
   * 传入 context 后才能加载持久化主题偏好。
   */
  init(context: common.Context): void {
    try {
      this.prefs = preferences.getPreferencesSync(context, { name: PREF_NAME });
      const saved: string = this.prefs.getSync(PREF_KEY, 'light') as string;
      this.setTheme(saved === 'dark' ? ThemeMode.Dark : ThemeMode.Light);
    } catch (e) {
      // preferences 未就绪时保持默认浅色
      this.setTheme(ThemeMode.Light);
    }
  }

  getTheme(): ThemeColors {
    return this.currentTheme;
  }

  getThemeMode(): ThemeMode {
    return this.currentTheme.mode;
  }

  setTheme(mode: ThemeMode): void {
    if (mode === ThemeMode.Dark) {
      this.currentTheme.copyFrom(DarkTheme);
    } else {
      this.currentTheme.copyFrom(LightTheme);
    }
    this.savePreference();
    this.notifyListeners();
  }

  toggleTheme(): void {
    if (this.currentTheme.mode === ThemeMode.Light) {
      this.setTheme(ThemeMode.Dark);
    } else {
      this.setTheme(ThemeMode.Light);
    }
  }

  /** 注册主题变化监听 */
  onThemeChange(listener: ThemeChangeListener): void {
    const idx: number = this.themeChangeListeners.indexOf(listener);
    if (idx < 0) {
      this.themeChangeListeners.push(listener);
    }
  }

  /** 移除主题变化监听 */
  offThemeChange(listener: ThemeChangeListener): void {
    const idx: number = this.themeChangeListeners.indexOf(listener);
    if (idx >= 0) {
      this.themeChangeListeners.splice(idx, 1);
    }
  }

  // ── 私有 ──

  private savePreference(): void {
    if (this.prefs) {
      try {
        this.prefs.putSync(PREF_KEY, this.currentTheme.mode);
        this.prefs.flushSync();
      } catch (e) {
        // 保存失败静默忽略
      }
    }
  }

  private notifyListeners(): void {
    // 快照防止回调中修改数组
    const snapshot: ThemeChangeListener[] = [];
    for (let i = 0; i < this.themeChangeListeners.length; i++) {
      snapshot.push(this.themeChangeListeners[i]);
    }
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i](this.currentTheme);
    }
  }
}

/** 主题变化回调 */
export type ThemeChangeListener = (theme: ThemeColors) => void;
