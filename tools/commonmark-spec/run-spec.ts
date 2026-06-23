/**
 * run-spec.ts — CommonMark 0.31.2 规范一致性测试管线
 *
 * 对 652 条官方用例逐一运行解析+渲染，分类为 EXACT/COSMETIC/STRUCT/ERROR/HANG，
 * 按 section 聚合统计，输出分节表 + failures.txt + baseline.json。
 *
 * 使用 child_process spawn 做 per-case 超时保护：
 * 启动一个长期存活的 worker 进程处理用例，主线程逐条发送 markdown 并等待结果。
 * 若某条用例超时未返回，kill worker 并重启，该条计为 ERROR(TIMEOUT)。
 *
 * HANG 保护：启动时读 skip.json，遇到已知死循环用例直接跳过，绝不调用 parse。
 *
 * 用法: cd tools/commonmark-spec && ./node_modules/.bin/tsx run-spec.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';

// ── 类型 ──

interface SpecCase {
  markdown: string;
  html: string;
  example: number;
  start_line: number;
  end_line: number;
  section: string;
}

type Category = 'EXACT' | 'COSMETIC' | 'STRUCT' | 'ERROR' | 'HANG';

interface ResultEntry {
  example: number;
  section: string;
  category: Category;
  markdown: string;
  expected: string;
  actual: string;
  error?: string;
  reason?: string;
}

interface SectionStat {
  section: string;
  total: number;
  exact: number;
  cosmetic: number;
  struct: number;
  error: number;
  hang: number;
}

// ── 保守归一化：只去无意义空白，不动结构/标签间空白 ──

function normalize(s: string): string {
  return s
    .replace(/[ \t]+$/gm, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+$/, '\n')
    .replace(/^\n+/, '');
}

// ── Worker 管理 ──

const PER_CASE_TIMEOUT_MS = 5000;

class ParserWorker {
  private proc: ChildProcess | null = null;
  private ready: boolean = false;
  private rl: ReturnType<typeof createInterface> | null = null;
  private pendingResolve: ((value: { actual?: string; error?: string }) => void) | null = null;
  private tsxPath: string;
  private workerPath: string;

  constructor(tsxPath: string, workerPath: string) {
    this.tsxPath = tsxPath;
    this.workerPath = workerPath;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn(this.tsxPath, [this.workerPath], {
        stdio: ['pipe', 'pipe', 'inherit'],
      });

      this.rl = createInterface({ input: this.proc.stdout! });

      this.rl.on('line', (line: string) => {
        try {
          const msg = JSON.parse(line);
          if (msg.ready) {
            this.ready = true;
            resolve();
          } else if (this.pendingResolve) {
            this.pendingResolve(msg);
            this.pendingResolve = null;
          }
        } catch (_e) {
          // ignore unparseable lines
        }
      });

      this.proc.on('error', (err: Error) => {
        this.ready = false;
        reject(err);
      });

      this.proc.on('exit', () => {
        this.ready = false;
        if (this.pendingResolve) {
          this.pendingResolve({ error: 'Worker exited unexpectedly' });
          this.pendingResolve = null;
        }
      });
    });
  }

  async parseAndRender(md: string): Promise<{ actual?: string; error?: string }> {
    if (!this.proc || !this.ready) {
      throw new Error('Worker not ready');
    }

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.proc!.stdin!.write(JSON.stringify({ markdown: md }) + '\n');
    });
  }

  async kill(): Promise<void> {
    if (this.proc) {
      this.proc.kill('SIGKILL');
      this.proc = null;
      this.ready = false;
      if (this.pendingResolve) {
        this.pendingResolve({ error: 'Worker killed (timeout)' });
        this.pendingResolve = null;
      }
      // Brief pause to let OS clean up
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// ── skip.json 读取 ──

interface SkipEntry {
  example: number;
  section: string;
  reason: string;
}

interface SkipFile {
  _comment?: string;
  examples: SkipEntry[];
}

function loadSkipSet(skipPath: string): { skipSet: Set<number>; reasonMap: Map<number, string> } {
  const skipSet: Set<number> = new Set<number>();
  const reasonMap: Map<number, string> = new Map<number, string>();

  try {
    const raw: string = readFileSync(skipPath, 'utf-8');
    const data: SkipFile = JSON.parse(raw) as SkipFile;
    if (data.examples && Array.isArray(data.examples)) {
      for (const entry of data.examples) {
        skipSet.add(entry.example);
        reasonMap.set(entry.example, entry.reason);
      }
    }
  } catch (e) {
    console.warn('WARNING: Cannot read skip.json:', (e as Error).message);
    console.warn('  Continuing without skip list (may hang on known dead-loop cases)');
  }

  return { skipSet, reasonMap };
}

// ── 主逻辑 ──

async function run(): Promise<void> {
  const tsxPath: string = join(__dirname, 'node_modules', '.bin', 'tsx');
  const workerPath: string = join(__dirname, 'spec-worker.ts');

  // 1. 读 spec.json
  const specPath: string = join(__dirname, 'spec.json');
  let cases: SpecCase[];

  try {
    const raw: string = readFileSync(specPath, 'utf-8');
    cases = JSON.parse(raw) as SpecCase[];
  } catch (e) {
    console.error('FATAL: Cannot read spec.json:', (e as Error).message);
    process.exit(1);
  }

  console.log(`Loaded ${cases.length} spec cases from spec.json`);

  // 2. 读 skip.json → 跳过集
  const skipPath: string = join(__dirname, 'skip.json');
  const { skipSet, reasonMap } = loadSkipSet(skipPath);
  if (skipSet.size > 0) {
    console.log(`Skip list loaded: ${skipSet.size} case(s) — ${Array.from(skipSet).join(', ')}`);
  }
  console.log('');

  const results: ResultEntry[] = new Array(cases.length);
  const sectionMap: Map<string, SectionStat> = new Map<string, SectionStat>();

  // Create initial worker
  let worker = new ParserWorker(tsxPath, workerPath);
  await worker.start();

  let sequentialErrorCount = 0;

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];

    let result: ResultEntry;

    // ── HANG 保护：跳过已知死循环用例，绝不调用 parse ──
    if (skipSet.has(tc.example)) {
      result = {
        example: tc.example,
        section: tc.section,
        category: 'HANG',
        markdown: tc.markdown,
        expected: tc.html,
        actual: '',
        reason: reasonMap.get(tc.example) ?? 'Known infinite loop (skip.json)',
      };
      sequentialErrorCount = 0;

      results[i] = result;

      // Aggregate
      const sec = result.section;
      if (!sectionMap.has(sec)) {
        sectionMap.set(sec, { section: sec, total: 0, exact: 0, cosmetic: 0, struct: 0, error: 0, hang: 0 });
      }
      const stat: SectionStat = sectionMap.get(sec)!;
      stat.total++;
      stat.hang++;

      // Progress
      if ((i + 1) % 50 === 0 || i === cases.length - 1) {
        const exactSoFar = results.filter((r: ResultEntry) => r && r.category === 'EXACT').length;
        const errSoFar = results.filter((r: ResultEntry) => r && r.category === 'ERROR').length;
        const hangSoFar = results.filter((r: ResultEntry) => r && r.category === 'HANG').length;
        console.log(`  ${i + 1}/${cases.length}  exact=${exactSoFar}  error=${errSoFar}  hang=${hangSoFar}`);
      }

      continue;
    }

    try {
      const timeoutPromise = new Promise<{ actual?: string; error?: string }>((resolve) => {
        setTimeout(() => resolve({ error: 'TIMEOUT: parse/render exceeded ' + PER_CASE_TIMEOUT_MS + 'ms, likely infinite loop' }), PER_CASE_TIMEOUT_MS);
      });

      const workPromise = worker.parseAndRender(tc.markdown);

      const outcome = await Promise.race([workPromise, timeoutPromise]);

      if (outcome.error) {
        // Worker might still be alive; kill and restart
        if (outcome.error.startsWith('TIMEOUT')) {
          await worker.kill();
          worker = new ParserWorker(tsxPath, workerPath);
          await worker.start();
        }

        result = {
          example: tc.example,
          section: tc.section,
          category: 'ERROR',
          markdown: tc.markdown,
          expected: tc.html,
          actual: '',
          error: outcome.error,
        };
        sequentialErrorCount++;
      } else {
        const actual: string = outcome.actual!;
        let cat: Category;
        if (actual === tc.html) {
          cat = 'EXACT';
        } else if (normalize(actual) === normalize(tc.html)) {
          cat = 'COSMETIC';
        } else {
          cat = 'STRUCT';
        }

        result = {
          example: tc.example,
          section: tc.section,
          category: cat,
          markdown: tc.markdown,
          expected: tc.html,
          actual,
        };
        sequentialErrorCount = 0;
      }
    } catch (e) {
      // Worker crashed — restart and mark as error
      await worker.kill().catch(() => {});
      worker = new ParserWorker(tsxPath, workerPath);
      await worker.start();

      result = {
        example: tc.example,
        section: tc.section,
        category: 'ERROR',
        markdown: tc.markdown,
        expected: tc.html,
        actual: '',
        error: 'Worker crashed: ' + ((e as Error).message || ''),
      };
      sequentialErrorCount++;
    }

    results[i] = result;

    // Aggregate
    const sec = result.section;
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, { section: sec, total: 0, exact: 0, cosmetic: 0, struct: 0, error: 0, hang: 0 });
    }
    const stat: SectionStat = sectionMap.get(sec)!;
    stat.total++;
    if (result.category === 'EXACT') stat.exact++;
    else if (result.category === 'COSMETIC') stat.cosmetic++;
    else if (result.category === 'STRUCT') stat.struct++;
    else if (result.category === 'ERROR') stat.error++;
    // HANG is handled in its own block above — not reached here

    // Progress
    if ((i + 1) % 50 === 0 || i === cases.length - 1) {
      const exactSoFar = results.filter((r: ResultEntry) => r && r.category === 'EXACT').length;
      const errSoFar = results.filter((r: ResultEntry) => r && r.category === 'ERROR').length;
      const hangSoFar = results.filter((r: ResultEntry) => r && r.category === 'HANG').length;
      console.log(`  ${i + 1}/${cases.length}  exact=${exactSoFar}  error=${errSoFar}  hang=${hangSoFar}`);
    }
  }

  await worker.kill().catch(() => {});

  // ── 排序：按 section 名字典序 ──

  const sections: SectionStat[] = Array.from(sectionMap.values());
  sections.sort((a: SectionStat, b: SectionStat): number => a.section.localeCompare(b.section));

  // ── 总计 ──

  const total: number = results.length;
  const totalExact: number = results.filter((r: ResultEntry) => r.category === 'EXACT').length;
  const totalCosmetic: number = results.filter((r: ResultEntry) => r.category === 'COSMETIC').length;
  const totalStruct: number = results.filter((r: ResultEntry) => r.category === 'STRUCT').length;
  const totalError: number = results.filter((r: ResultEntry) => r.category === 'ERROR').length;
  const totalHang: number = results.filter((r: ResultEntry) => r.category === 'HANG').length;

  // ── 打印表格 ──

  const colSection: number = Math.max(40, ...sections.map((s: SectionStat) => s.section.length)) + 2;
  const colNum: number = 9;

  function padRight(s: string, w: number): string {
    return s + ' '.repeat(Math.max(0, w - s.length));
  }
  function padLeft(s: string, w: number): string {
    return ' '.repeat(Math.max(0, w - s.length)) + s;
  }

  const header: string =
    padRight('Section', colSection) +
    padLeft('Total', colNum) +
    padLeft('Exact', colNum) +
    padLeft('Cosmetic', colNum) +
    padLeft('Struct', colNum) +
    padLeft('Error', colNum) +
    padLeft('Hang', colNum);
  console.log('\n' + header);
  console.log('─'.repeat(header.length));

  for (const s of sections) {
    console.log(
      padRight(s.section, colSection) +
        padLeft(String(s.total), colNum) +
        padLeft(String(s.exact), colNum) +
        padLeft(String(s.cosmetic), colNum) +
        padLeft(String(s.struct), colNum) +
        padLeft(String(s.error), colNum) +
        padLeft(String(s.hang), colNum),
    );
  }

  console.log('─'.repeat(header.length));
  console.log(
    padRight('TOTAL', colSection) +
      padLeft(String(total), colNum) +
      padLeft(String(totalExact), colNum) +
      padLeft(String(totalCosmetic), colNum) +
      padLeft(String(totalStruct), colNum) +
      padLeft(String(totalError), colNum) +
      padLeft(String(totalHang), colNum),
  );
  console.log('');

  const exactPct: string = ((totalExact / total) * 100).toFixed(2);
  const nearPct: string = (((totalExact + totalCosmetic) / total) * 100).toFixed(2);
  console.log(`Exact:  ${exactPct}%  (${totalExact}/${total})`);
  console.log(`Near:   ${nearPct}%  (${totalExact + totalCosmetic}/${total})`);
  if (totalHang > 0) {
    console.log(`\nHANG(已跳过,死循环): ${totalHang} 条  (#${Array.from(skipSet).join(', #')})`);
  }
  console.log('');

  // ── failures.txt ──

  const failures: ResultEntry[] = results.filter((r: ResultEntry) => r.category !== 'EXACT');
  const categoryOrder: Record<string, number> = { HANG: 0, ERROR: 1, STRUCT: 2, COSMETIC: 3 };
  failures.sort((a: ResultEntry, b: ResultEntry): number => {
    const ca: number = categoryOrder[a.category] ?? 99;
    const cb: number = categoryOrder[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.example - b.example;
  });

  let failureText: string = '';
  failureText += '# CommonMark Spec Failures\n';
  failureText += '# Generated: ' + new Date().toISOString() + '\n';
  failureText += '# Total non-EXACT: ' + failures.length + ' (HANG: ' + totalHang + ', ERROR: ' + totalError + ', STRUCT: ' + totalStruct + ', COSMETIC: ' + totalCosmetic + ')\n';
  failureText += '\n';

  for (const f of failures) {
    if (f.category === 'HANG') {
      // HANG: only example + section + reason, no actual output
      failureText += '### Example ' + f.example + '  [' + f.section + ']  (HANG)\n';
      failureText += 'Reason: ' + (f.reason || '(no reason)') + '\n';
      failureText += '\n';
    } else {
      failureText += '### Example ' + f.example + '  [' + f.section + ']  (' + f.category + ')\n';
      failureText += '--- markdown (JSON) ---\n';
      failureText += JSON.stringify(f.markdown) + '\n';
      failureText += '--- expected ---\n';
      failureText += f.expected + '\n';
      failureText += '--- actual ---\n';
      if (f.category === 'ERROR') {
        failureText += (f.error || '(no error detail)') + '\n';
      } else {
        failureText += f.actual + '\n';
      }
      failureText += '\n';
    }
  }

  const failuresPath: string = join(__dirname, 'failures.txt');
  writeFileSync(failuresPath, failureText, 'utf-8');
  console.log('failures.txt written: ' + failures.length + ' entries (' + Buffer.byteLength(failureText, 'utf-8') + ' bytes)');

  // ── baseline.json ──

  const baseline: Record<string, unknown> = {
    specVersion: '0.31.2',
    date: new Date().toISOString(),
    total,
    exact: totalExact,
    cosmetic: totalCosmetic,
    struct: totalStruct,
    error: totalError,
    hang: totalHang,
    exactPct: parseFloat(exactPct),
    nearPct: parseFloat(nearPct),
    bySection: sections,
  };

  const baselinePath: string = join(__dirname, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf-8');
  console.log('baseline.json written: ' + Buffer.byteLength(JSON.stringify(baseline, null, 2) + '\n', 'utf-8') + ' bytes');

  // Warning if any timeout
  const timeoutCount = results.filter((r: ResultEntry) => r.error && r.error.startsWith('TIMEOUT')).length;
  if (timeoutCount > 0) {
    console.log(`\n⚠ ${timeoutCount} case(s) timed out (killed by process termination)`);
  }

  process.exit(0);
}

run();
