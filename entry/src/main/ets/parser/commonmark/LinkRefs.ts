/**
 * LinkRefs — 链接引用定义存储
 *
 * 对标 tui.editor libs/toastmark/src/commonmark/link-refs.ts。
 * 支持 CommonMark 引用式链接：在 parse() 开头预扫全文收集 [label]: dest "title" 定义，
 * inline 解析时通过 linkRefs.get(label) 查找。
 *
 * 使用 Map 而非 Record（ArkTS 严格模式禁止索引签名）。
 */

/** 单个链接引用定义 */
export class LinkRefDef {
  url: string = '';
  title: string = '';
}

/**
 * 链接引用定义存储（全局单例）。
 * label 归一化：trim → 折叠连续空白为单个空格 → 小写。
 * 首个定义优先（CommonMark 规范）。
 */
class LinkRefStore {
  private map: Map<string, LinkRefDef> = new Map<string, LinkRefDef>();

  /** 清空所有定义 */
  clear(): void {
    this.map.clear();
  }

  /**
   * label 归一化：trim → 折叠内部连续空白为单个空格 → 转小写。
   * 空 label 返回 ''。
   */
  normalize(label: string): string {
    let result: string = label.trim();
    if (result === '') return '';

    // 折叠内部连续空白为单个空格（用 split/join，不用正则 \\ 反斜杠）
    let folded: string = '';
    let inSpace: boolean = false;
    for (let i: number = 0; i < result.length; i++) {
      const ch: string = result[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        if (!inSpace) {
          folded += ' ';
          inSpace = true;
        }
      } else {
        folded += ch;
        inSpace = false;
      }
    }
    result = folded;

    // 转小写
    result = result.toLowerCase();
    return result;
  }

  /** 存储定义（首个优先：已有 label 不覆盖） */
  set(label: string, def: LinkRefDef): void {
    const k: string = this.normalize(label);
    if (k !== '' && !this.map.has(k)) {
      this.map.set(k, def);
    }
  }

  /** 按归一化 label 查询，找不到返回 undefined */
  get(label: string): LinkRefDef | undefined {
    return this.map.get(this.normalize(label));
  }

  /** 判断给定 label 是否已定义 */
  has(label: string): boolean {
    return this.map.has(this.normalize(label));
  }
}

/** 全局链接引用定义单例 */
export const linkRefs: LinkRefStore = new LinkRefStore();
