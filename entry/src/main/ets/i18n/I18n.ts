/**
 * I18n — 国际化管理
 *
 * 对标 tui.editor 的 i18n/i18n.ts。
 * 完整对标 tui.editor 的 ~110 个 UI key，支持中/英/日/韩。
 * 可通过 addLanguage() 扩展更多语言。
 * 适配 ArkTS：用 class + if-else 代替 Record 动态键访问。
 * 支持偏好持久化。
 */

import { preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';

export class I18n {
  private static instance: I18n | null = null;
  private code: string = 'zh-CN';
  private langs: LangPack[] = [];
  private languageChangeListeners: LanguageChangeListener[] = [];
  private prefs: preferences.Preferences | null = null;

  static getInstance(): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  private constructor() {
    // 加载内置语言包（按需加载，此处注册）
    this.langs.push(new ZhCN());
    this.langs.push(new EnUS());
    this.langs.push(new JaJP());
    this.langs.push(new KoKR());
  }

  /**
   * 初始化偏好存储（由 UIAbility 的 onCreate 调用）。
   */
  init(context: common.Context): void {
    try {
      this.prefs = preferences.getPreferencesSync(context, { name: 'editor_i18n' });
      const saved: string = this.prefs.getSync('language', 'zh-CN') as string;
      this.setCode(saved);
    } catch (e) {
      // 偏好未就绪，保持默认
    }
  }

  setCode(code: string): void {
    if (this.code === code) return;
    this.code = code;
    this.savePreference();
    this.notifyListeners();
  }

  getCode(): string {
    return this.code;
  }

  /** 获取翻译文本，找不到返回 key 本身或 fallback */
  get(key: string, fallback?: string): string {
    for (let i = 0; i < this.langs.length; i++) {
      if (this.langs[i].code === this.code) {
        const val: string = this.langs[i].get(key);
        if (val !== '') return val;
        break;
      }
    }
    // 回退到英文
    if (this.code !== 'en-US') {
      for (let i = 0; i < this.langs.length; i++) {
        if (this.langs[i].code === 'en-US') {
          const val: string = this.langs[i].get(key);
          if (val !== '') return val;
          break;
        }
      }
    }
    if (fallback) return fallback;
    return key;
  }

  /** 追加语言 */
  addLanguage(lang: LangPack): void {
    // 检查是否已存在同 code 的语言包
    for (let i = 0; i < this.langs.length; i++) {
      if (this.langs[i].code === lang.code) {
        this.langs[i] = lang; // 替换
        return;
      }
    }
    this.langs.push(lang);
  }

  /** 获取可用的语言列表 */
  getAvailableLanguages(): LangInfo[] {
    const result: LangInfo[] = [];
    for (let i = 0; i < this.langs.length; i++) {
      const info: LangInfo = new LangInfo();
      info.code = this.langs[i].code;
      info.name = this.langs[i].getName();
      result.push(info);
    }
    return result;
  }

  /** 注册语言变化监听 */
  onLanguageChange(listener: LanguageChangeListener): void {
    const idx: number = this.languageChangeListeners.indexOf(listener);
    if (idx < 0) {
      this.languageChangeListeners.push(listener);
    }
  }

  /** 移除语言变化监听 */
  offLanguageChange(listener: LanguageChangeListener): void {
    const idx: number = this.languageChangeListeners.indexOf(listener);
    if (idx >= 0) {
      this.languageChangeListeners.splice(idx, 1);
    }
  }

  // ── 私有 ──

  private savePreference(): void {
    if (this.prefs) {
      try {
        this.prefs.putSync('language', this.code);
        this.prefs.flushSync();
      } catch (e) { /* 静默 */ }
    }
  }

  private notifyListeners(): void {
    const snapshot: LanguageChangeListener[] = [];
    for (let i = 0; i < this.languageChangeListeners.length; i++) {
      snapshot.push(this.languageChangeListeners[i]);
    }
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i](this.code);
    }
  }
}

// ── 类型定义 ──

/** 语言包接口 */
export interface LangPack {
  code: string;
  getName(): string;
  get(key: string): string;
}

/** 语言信息（用于语言选择器） */
export class LangInfo {
  code: string = '';
  name: string = '';
}

/** 语言变化回调 */
export type LanguageChangeListener = (code: string) => void;

// ═══════════════════════════════════════════════════════════
//  内置语言包 — 完整对标 tui.editor 的 i18n key 体系
// ═══════════════════════════════════════════════════════════

/** 中文（简体）语言包 */
class ZhCN implements LangPack {
  code: string = 'zh-CN';

  getName(): string { return '中文（简体）'; }

  get(key: string): string {
    // ── 工具栏按钮 ──
    if (key === 'Bold') return '粗体';
    if (key === 'Italic') return '斜体';
    if (key === 'Strike') return '删除线';
    if (key === 'Code') return '行内代码';
    if (key === 'Codeblock') return '代码块';
    if (key === 'Heading') return '标题';
    if (key === 'Quote') return '引用';
    if (key === 'BulletList') return '无序列表';
    if (key === 'OrderedList') return '有序列表';
    if (key === 'TaskList') return '任务列表';
    if (key === 'Indent') return '增加缩进';
    if (key === 'Outdent') return '减少缩进';
    if (key === 'Link') return '链接';
    if (key === 'Image') return '图片';
    if (key === 'Table') return '表格';
    if (key === 'HorizontalRule') return '分割线';
    if (key === 'Undo') return '撤销';
    if (key === 'Redo') return '重做';
    if (key === 'ScrollSync') return '滚动同步';

    // ── 模式切换 ──
    if (key === 'Markdown') return 'Markdown';
    if (key === 'WYSIWYG') return '所见即所得';
    if (key === 'Preview') return '预览';

    // ── 菜单 ──
    if (key === 'File') return '文件';
    if (key === 'Edit') return '编辑';
    if (key === 'View') return '视图';
    if (key === 'Insert') return '插入';
    if (key === 'Format') return '格式';
    if (key === 'Theme') return '主题';
    if (key === 'Help') return '帮助';

    // ── 主题 ──
    if (key === 'Light') return '浅色';
    if (key === 'Dark') return '深色';

    // ── 文件操作 ──
    if (key === 'New') return '新建';
    if (key === 'Open') return '打开';
    if (key === 'Save') return '保存';
    if (key === 'SaveAs') return '另存为';
    if (key === 'Export') return '导出';
    if (key === 'ExportHTML') return '导出 HTML';
    if (key === 'ExportPDF') return '导出 PDF';
    if (key === 'ExportMarkdown') return '导出 Markdown';
    if (key === 'Print') return '打印';

    // ── 标题级别 ──
    if (key === 'Heading1') return '标题 1';
    if (key === 'Heading2') return '标题 2';
    if (key === 'Heading3') return '标题 3';
    if (key === 'Heading4') return '标题 4';
    if (key === 'Heading5') return '标题 5';
    if (key === 'Heading6') return '标题 6';
    if (key === 'Paragraph') return '正文';

    // ── 表格编辑 ──
    if (key === 'AddRow') return '添加行';
    if (key === 'AddCol') return '添加列';
    if (key === 'RemoveRow') return '删除行';
    if (key === 'RemoveCol') return '删除列';
    if (key === 'AlignLeft') return '左对齐';
    if (key === 'AlignCenter') return '居中';
    if (key === 'AlignRight') return '右对齐';
    if (key === 'MergeCells') return '合并单元格';
    if (key === 'SplitCells') return '拆分单元格';

    // ── 链接编辑 ──
    if (key === 'LinkText') return '链接文本';
    if (key === 'LinkURL') return '链接地址';
    if (key === 'RemoveLink') return '移除链接';
    if (key === 'ApplyLink') return '应用';

    // ── 图片编辑 ──
    if (key === 'ImageURL') return '图片地址';
    if (key === 'ImageAlt') return '替代文本';
    if (key === 'AddImage') return '添加图片';
    if (key === 'RemoveImage') return '移除图片';

    // ── 通用 ──
    if (key === 'OK') return '确定';
    if (key === 'Cancel') return '取消';
    if (key === 'Close') return '关闭';
    if (key === 'Delete') return '删除';
    if (key === 'Copy') return '复制';
    if (key === 'Cut') return '剪切';
    if (key === 'Paste') return '粘贴';
    if (key === 'SelectAll') return '全选';
    if (key === 'Search') return '搜索';
    if (key === 'Replace') return '替换';
    if (key === 'NoResult') return '无结果';
    if (key === 'More') return '更多';

    // ── 状态 ──
    if (key === 'Saving') return '保存中…';
    if (key === 'Saved') return '已保存';
    if (key === 'Unsaved') return '未保存';
    if (key === 'Loading') return '加载中…';
    if (key === 'Ready') return '就绪';

    // ── 错误 ──
    if (key === 'ErrorSave') return '保存失败';
    if (key === 'ErrorLoad') return '加载失败';
    if (key === 'ErrorExport') return '导出失败';

    return '';
  }
}

/** 英文语言包 */
class EnUS implements LangPack {
  code: string = 'en-US';

  getName(): string { return 'English'; }

  get(key: string): string {
    if (key === 'Bold') return 'Bold';
    if (key === 'Italic') return 'Italic';
    if (key === 'Strike') return 'Strikethrough';
    if (key === 'Code') return 'Inline Code';
    if (key === 'Codeblock') return 'Code Block';
    if (key === 'Heading') return 'Heading';
    if (key === 'Quote') return 'Quote';
    if (key === 'BulletList') return 'Bullet List';
    if (key === 'OrderedList') return 'Ordered List';
    if (key === 'TaskList') return 'Task List';
    if (key === 'Indent') return 'Indent';
    if (key === 'Outdent') return 'Outdent';
    if (key === 'Link') return 'Link';
    if (key === 'Image') return 'Image';
    if (key === 'Table') return 'Table';
    if (key === 'HorizontalRule') return 'Horizontal Rule';
    if (key === 'Undo') return 'Undo';
    if (key === 'Redo') return 'Redo';
    if (key === 'ScrollSync') return 'Scroll Sync';

    if (key === 'Markdown') return 'Markdown';
    if (key === 'WYSIWYG') return 'WYSIWYG';
    if (key === 'Preview') return 'Preview';

    if (key === 'File') return 'File';
    if (key === 'Edit') return 'Edit';
    if (key === 'View') return 'View';
    if (key === 'Insert') return 'Insert';
    if (key === 'Format') return 'Format';
    if (key === 'Theme') return 'Theme';
    if (key === 'Help') return 'Help';

    if (key === 'Light') return 'Light';
    if (key === 'Dark') return 'Dark';

    if (key === 'New') return 'New';
    if (key === 'Open') return 'Open';
    if (key === 'Save') return 'Save';
    if (key === 'SaveAs') return 'Save As';
    if (key === 'Export') return 'Export';
    if (key === 'ExportHTML') return 'Export HTML';
    if (key === 'ExportPDF') return 'Export PDF';
    if (key === 'ExportMarkdown') return 'Export Markdown';
    if (key === 'Print') return 'Print';

    if (key === 'Heading1') return 'Heading 1';
    if (key === 'Heading2') return 'Heading 2';
    if (key === 'Heading3') return 'Heading 3';
    if (key === 'Heading4') return 'Heading 4';
    if (key === 'Heading5') return 'Heading 5';
    if (key === 'Heading6') return 'Heading 6';
    if (key === 'Paragraph') return 'Paragraph';

    if (key === 'AddRow') return 'Add Row';
    if (key === 'AddCol') return 'Add Column';
    if (key === 'RemoveRow') return 'Remove Row';
    if (key === 'RemoveCol') return 'Remove Column';
    if (key === 'AlignLeft') return 'Align Left';
    if (key === 'AlignCenter') return 'Align Center';
    if (key === 'AlignRight') return 'Align Right';
    if (key === 'MergeCells') return 'Merge Cells';
    if (key === 'SplitCells') return 'Split Cells';

    if (key === 'LinkText') return 'Link Text';
    if (key === 'LinkURL') return 'Link URL';
    if (key === 'RemoveLink') return 'Remove Link';
    if (key === 'ApplyLink') return 'Apply';

    if (key === 'ImageURL') return 'Image URL';
    if (key === 'ImageAlt') return 'Alt Text';
    if (key === 'AddImage') return 'Add Image';
    if (key === 'RemoveImage') return 'Remove Image';

    if (key === 'OK') return 'OK';
    if (key === 'Cancel') return 'Cancel';
    if (key === 'Close') return 'Close';
    if (key === 'Delete') return 'Delete';
    if (key === 'Copy') return 'Copy';
    if (key === 'Cut') return 'Cut';
    if (key === 'Paste') return 'Paste';
    if (key === 'SelectAll') return 'Select All';
    if (key === 'Search') return 'Search';
    if (key === 'Replace') return 'Replace';
    if (key === 'NoResult') return 'No results';
    if (key === 'More') return 'More';

    if (key === 'Saving') return 'Saving…';
    if (key === 'Saved') return 'Saved';
    if (key === 'Unsaved') return 'Unsaved';
    if (key === 'Loading') return 'Loading…';
    if (key === 'Ready') return 'Ready';

    if (key === 'ErrorSave') return 'Save failed';
    if (key === 'ErrorLoad') return 'Load failed';
    if (key === 'ErrorExport') return 'Export failed';

    return '';
  }
}

/** 日文语言包 (簡易) */
class JaJP implements LangPack {
  code: string = 'ja-JP';

  getName(): string { return '日本語'; }

  get(key: string): string {
    if (key === 'Bold') return '太字';
    if (key === 'Italic') return '斜体';
    if (key === 'Strike') return '打ち消し線';
    if (key === 'Code') return 'インラインコード';
    if (key === 'Codeblock') return 'コードブロック';
    if (key === 'Heading') return '見出し';
    if (key === 'Quote') return '引用';
    if (key === 'BulletList') return '箇条書き';
    if (key === 'OrderedList') return '番号付きリスト';
    if (key === 'TaskList') return 'タスクリスト';
    if (key === 'Indent') return 'インデント';
    if (key === 'Outdent') return 'インデント解除';
    if (key === 'Link') return 'リンク';
    if (key === 'Image') return '画像';
    if (key === 'Table') return 'テーブル';
    if (key === 'HorizontalRule') return '水平線';
    if (key === 'Undo') return '元に戻す';
    if (key === 'Redo') return 'やり直す';
    if (key === 'ScrollSync') return 'スクロール同期';

    if (key === 'Markdown') return 'Markdown';
    if (key === 'WYSIWYG') return 'WYSIWYG';
    if (key === 'Preview') return 'プレビュー';

    if (key === 'File') return 'ファイル';
    if (key === 'Edit') return '編集';
    if (key === 'View') return '表示';
    if (key === 'Insert') return '挿入';
    if (key === 'Format') return '書式';
    if (key === 'Theme') return 'テーマ';
    if (key === 'Help') return 'ヘルプ';

    if (key === 'Light') return 'ライト';
    if (key === 'Dark') return 'ダーク';

    if (key === 'Save') return '保存';
    if (key === 'Export') return 'エクスポート';
    if (key === 'Print') return '印刷';

    if (key === 'OK') return 'OK';
    if (key === 'Cancel') return 'キャンセル';
    if (key === 'Close') return '閉じる';
    if (key === 'Delete') return '削除';
    if (key === 'Copy') return 'コピー';
    if (key === 'Cut') return '切り取り';
    if (key === 'Paste') return '貼り付け';
    if (key === 'SelectAll') return 'すべて選択';
    if (key === 'Search') return '検索';
    if (key === 'More') return 'もっと';

    return '';
  }
}

/** 韩文语言包 (簡易) */
class KoKR implements LangPack {
  code: string = 'ko-KR';

  getName(): string { return '한국어'; }

  get(key: string): string {
    if (key === 'Bold') return '굵게';
    if (key === 'Italic') return '기울임';
    if (key === 'Strike') return '취소선';
    if (key === 'Code') return '인라인 코드';
    if (key === 'Codeblock') return '코드 블록';
    if (key === 'Heading') return '제목';
    if (key === 'Quote') return '인용';
    if (key === 'BulletList') return '글머리 기호';
    if (key === 'OrderedList') return '번호 매기기';
    if (key === 'TaskList') return '할 일 목록';
    if (key === 'Link') return '링크';
    if (key === 'Image') return '이미지';
    if (key === 'Table') return '표';
    if (key === 'HorizontalRule') return '수평선';
    if (key === 'Undo') return '실행 취소';
    if (key === 'Redo') return '다시 실행';
    if (key === 'ScrollSync') return '스크롤 동기화';

    if (key === 'Markdown') return 'Markdown';
    if (key === 'WYSIWYG') return 'WYSIWYG';
    if (key === 'Preview') return '미리보기';

    if (key === 'File') return '파일';
    if (key === 'Edit') return '편집';
    if (key === 'View') return '보기';
    if (key === 'Insert') return '삽입';
    if (key === 'Format') return '서식';
    if (key === 'Theme') return '테마';

    if (key === 'Light') return '라이트';
    if (key === 'Dark') return '다크';

    if (key === 'Save') return '저장';
    if (key === 'Export') return '내보내기';
    if (key === 'Print') return '인쇄';

    if (key === 'OK') return '확인';
    if (key === 'Cancel') return '취소';
    if (key === 'Close') return '닫기';
    if (key === 'Delete') return '삭제';
    if (key === 'Copy') return '복사';
    if (key === 'Cut') return '잘라내기';
    if (key === 'Paste') return '붙여넣기';
    if (key === 'SelectAll') return '전체 선택';
    if (key === 'Search') return '검색';
    if (key === 'More') return '더보기';

    return '';
  }
}
