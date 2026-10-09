/**
 * FindReplace — 查找/替换纯逻辑
 *
 * 供 Markdown 与 WYSIWYG 两模式共用的匹配扫描与替换工具。
 * 全程不使用正则（ArkTS 严格模式下 `\\` 转义不可靠），改为逐字符比较。
 */

/** 匹配区间（具名 class，禁止匿名对象字面量） */
export class Match {
  start: number = 0;
  end: number = 0;
}

export class FindReplace {
  /**
   * 扫描全部（不重叠）匹配。不用正则；逐字符比较，忽略大小写时用 toLowerCase 单字符比较。
   * 空 query 或 query 长于 text → 返回空数组。
   */
  static findAll(text: string, query: string, caseSensitive: boolean): Match[] {
    const out: Match[] = [];
    if (query.length === 0 || query.length > text.length) return out;
    const limit: number = text.length - query.length;
    let i: number = 0;
    while (i <= limit) {
      let ok: boolean = true;
      for (let j: number = 0; j < query.length; j++) {
        const a: string = text[i + j];
        const b: string = query[j];
        if (caseSensitive) {
          if (a !== b) { ok = false; break; }
        } else {
          if (a.toLowerCase() !== b.toLowerCase()) { ok = false; break; }
        }
      }
      if (ok) {
        const m: Match = new Match();
        m.start = i;
        m.end = i + query.length;
        out.push(m);
        i += query.length;      // 不重叠
      } else {
        i++;
      }
    }
    return out;
  }

  /** 全部替换（基于 findAll 的区间拼接，逐段拼，不用正则/不用 replace） */
  static replaceAll(text: string, query: string, replacement: string, caseSensitive: boolean): string {
    const ms: Match[] = FindReplace.findAll(text, query, caseSensitive);
    if (ms.length === 0) return text;
    let out: string = '';
    let cur: number = 0;
    for (let k: number = 0; k < ms.length; k++) {
      out += text.substring(cur, ms[k].start) + replacement;
      cur = ms[k].end;
    }
    out += text.substring(cur);
    return out;
  }

  /** 从 from 起（含 from）第一个匹配的下标；无则 -1 */
  static firstIndexAtOrAfter(ms: Match[], from: number): number {
    for (let k: number = 0; k < ms.length; k++) {
      if (ms[k].start >= from) return k;
    }
    return -1;
  }
}
