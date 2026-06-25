# Active Task

## ✅ 已完成（详见 status.md）

- **Phase 1-4.8**：解析器 + EditorCore + Markdown 编辑/预览 + 文件 I/O，全部真机验证。
- **Phase 5 (WYSIWYG)**：引擎(@toast-ui/editor v3.2.2 **-all 全打包版**)/WwEditor WebView 容器/离线加载/ArkTS↔JS 双向桥/模式·文件切换同步/Toolbar 全套命令路由/bindPopup tooltip。**全部真机验证通过。**
- **图库插图（方案 A）**：PhotoViewPicker 选图 → 复制进沙箱 `filesDir/userimg/` → 相对路径 `userimg/x.png` → 两个 WebView 拦截器从 filesDir 读出。**真机验证通过。**

> 过程踩坑全部录入 Obsidian `鸿蒙开发/踩坑记录/`（WebView预览踩坑 十二~十七、bindPopup悬浮提示、文件IO 等）+ `官方组件示例-ComponentUXExamples.md`。

---

## 🎯 当前任务：Phase 8.2 — 解析器修复（见 status.md Next / Checkpoint）

> Phase 6（标题/缩进/字数）+ Phase 7（代码高亮）+ Phase 8.1（CommonMark 基线）均已完成。下面 Phase 6 段保留作**命令路由参考**。

## 命令路由机制（加新命令必读）— Phase 6 — Toolbar 增强 + 更多 Markdown 命令

> 新会话从这里开工。**Phase 6 具体范围建议开工前与用户确认**（下面是建议清单，未拍板）。

### 命令路由机制（加新命令必读）

- Toolbar 按钮 → `editorContext.editor.exec('CmdName', ...args)`。
- `Editor.exec`（`editor/Editor.ts`）：**WYSIWYG 模式 + wwExec 已注册** → `mapToTui(name)` 映射成 tui 命令名+payload → `window.__ww.exec`；**否则** → `core.exec`（MarkdownCommands 改 markdown 文本）。
- 带 payload 的命令（链接/图片/表格）：走 EditorPage 对话框确认 → `editor.wysiwygExec(name, payloadJson)`（WYSIWYG）/ markdown 文本插入（Markdown 模式）。
- 工具栏 tooltip：`Toolbar.ets` 的 `@Builder iconBtn(media, tip, action)` 用 **bindPopup**（`hoveredTip===tip`, `placement:Bottom, mask:false`，系统浮层不裁切）。

**加一个新工具栏命令 = 改三处：**
1. `components/Toolbar.ets`：加按钮 `this.iconBtn($r('app.media.tui_xxx'), '中文名', () => { if (editorContext.editor) editorContext.editor.exec('Xxx'); })`（自带 tooltip + hover）。
2. `editor/Editor.ts` 的 `mapToTui`：加 `if (name === 'Xxx') { c.cmd = 'tui命令名'; [c.payloadJson=...] return c; }`（WYSIWYG 路由）。
3. `editor/commands/commands/MarkdownCommands.ts`：加 Xxx 命令（Markdown 模式的文本操作）。
- 缺 SVG 图标先建 `resources/base/media/tui_xxx.svg`（Feather 风格、`stroke="currentColor"`、24×24 viewBox，见 CLAUDE.md UI 规范）。
- tui.editor 合法命令名/payload 可从 `entry/src/main/resources/rawfile/tui-editor/toastui-editor-all.min.js` grep 核实（如 `indent`/`outdent`/`heading` 等）。

### Phase 6 建议批次（待与用户确认/调整）

- [x] 6.1 标题级别 H1-H6 — **✅ 真机验证通过**（两模式）。Toolbar.ets 标题按钮改 bindMenu 下拉（H1-H6），后端 mapToTui/HeadingCommand 本就支持级别参数，未动。spec: `.project/6.1-heading-levels-spec.md`。
- [x] 6.2 缩进 / 减少缩进（tui 命令 `indent` / `outdent`）— **✅ 真机验证通过**（两模式）。三处代码 + 2 新图标。WYSIWYG 行为同 tui 原版：indent/outdent 仅作用于列表项（普通段落被引擎禁用，无效属正常）；indent 需前置兄弟项才能嵌套；顶层项 outdent = 提升为段落。spec: `.project/6.2-indent-outdent-spec.md`。
- [x] 6.3 字数统计强化 — **✅ 真机验证通过**。StatusBar.ets 加总行数；Markdown 实时。已知限制（暂缓）：WYSIWYG 字数/字符/行数不实时，切模式才同步。撤销/重做经确认两模式正常（仅工具栏命令；打字撤销未支持，暂缓）。spec: `.project/6.3-wordcount-spec.md`。
- [ ] 6.3+ 其它候选（待定）：查找替换（独立大批次）；更多对齐（不建议，与 Markdown 内核冲突）。

### 暂缓（用户明确放后面）

- 图片 pickStatus 失败文案美化、DocumentViewPicker（任意文件源）、大图压缩。
- **WYSIWYG/MdPreview 暗色与应用 ThemeService 调色板统一**（现三处暗色各自为政：ArkUI 外壳=ThemeService 28 token / MdPreview=HtmlRenderer 自有暗色 / WYSIWYG=tui+prism 暗色）。方案=把 ThemeService token 注入两个 WebView、覆盖其暗色 CSS 变量/选择器。⚠️ HarmonyOS 系统深色（`Web().darkMode(WebDarkMode.Auto)`/`forceDarkAccess`）只跟随 OS、不解决与自定义调色板一致，且 forceDark 算法反色会和 tui 自带暗色打架，又与现有应用内手动主题按钮冲突——**不采用**。
- WYSIWYG 模式字数/字符/行数实时更新（现切模式才同步；修它需碰 Phase 5 的 change 回写路径，有 echo-loop 回归风险）。
- 打字撤销/重做（现仅工具栏命令进撤销栈；打字需加防抖快照，Markdown 走 CommandManager、WYSIWYG 走引擎 history，两边各有坑）。
- Phase 6.3+ 候选：查找替换（独立大批次）；更多对齐（不建议，与 Markdown 内核冲突）。

---

## 关键约定（恢复必读）

- **Hermes 绝不写代码**：全部 `delegate` 给 CC（Docker 容器 `claude-code`）。Hermes 负责：写 spec → 审 diff → 修权限 → commit/push → 更新 .project。
- **调用 CC**：`/app/venv/bin/docker exec claude-code bash -c 'source /root/.cc_env && cd /data/docs/TuiEditorHarmonyOS && claude -p "..." --allowedTools "Read,Edit,Write"'`（实现类任务**不设 --max-turns**；后台跑用 `background=true, notify_on_complete=true`）。
- **审 diff 前修权限**：`/app/venv/bin/docker run --rm -v "/home/aintnece/Online Document/TuiEditorHarmonyOS:/ws" alpine chown -R 1000:1000 /ws`，再 `chmod 644` 改过的文件。
- **推送（HTTPS + token + 代理，主路径，2026-06-25 验证）**：直连 GitHub HTTPS/SSH 都不稳（HTTPS 被墙、SSH key 放 /tmp 随容器重启丢）。最稳方案 = 走 mihomo 代理 + NAS 持久 token：
  ① mihomo 容器 IP **会随重启漂移**，先查当前：`/app/venv/bin/docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' hermes-mihomo`（取 `172.26.x` 那个，webui 同网段；端口 7890）。
  ② push（⚠️ token 路径含空格，旧写法 `cat \"/data/Online Document/.gittoken\"` 直接放进 credential.helper 会被引号转义拆词→`cat: '"/data/Online'`→认证失败。**正解 = 先读进变量再内联值**）：
     先 `read -r TOKEN < "/data/Online Document/.gittoken"`（⚠️ 别用 `TOKEN=$(cat …)`——Hermes terminal 脱敏机制会把 `$(cat` 替成 *** 致 bash 语法错误；`read -r` 无命令替换，稳），再
     `git -c safe.directory='*' -c http.proxy=http://<IP>:7890 -c credential.helper='!f(){ echo username=x-access-token; echo "password='"$TOKEN"'"; }; f' push https://github.com/aintnece/TuiEditorHarmonyOS.git master:main`（2026-06-25 此写法验证成功）。
  - token 存 **NAS 持久文件 `/data/Online Document/.gittoken`（仓库外、重启不丢、已 chmod 600）**；token 是 GitHub PAT(classic, repo scope)，若失效让用户重生成写入该文件。验证：`git -c http.proxy=http://<IP>:7890 ls-remote ... refs/heads/main`。
  - 备路径 SSH：`~/.ssh/gitpush_key`（公钥需加 GitHub；容器重启会丢私钥须重生成+重加，不推荐）。
- **开工前**：grep/读 Obsidian `鸿蒙开发/踩坑记录/` 对应文档；新坑解决后补录（一坑一文件）。`官方组件示例` 离线仓库在 `/data/Online Document/_refs/HarmonyOSComponentUXExamples/`。
- CC 不编译（无 CLI）；编译/真机由用户在 DevEco(Windows) 做。每个改动 push 后请用户 `git pull` + 真机验证。

## Phase 8 测试管线（恢复必读）

- harness 在仓库根 `tools/commonmark-spec/`（**不进 hvigor 构建**，只在 Node 跑）。
- 跑基线：`/app/venv/bin/docker exec claude-code bash -lc 'cd /data/docs/TuiEditorHarmonyOS/tools/commonmark-spec && ./node_modules/.bin/tsx run-spec.ts'`（CC 视角路径；Hermes 视角 `/data/Online Document/...`）。
- `node_modules`(tsx) 是 **Hermes 离线 vendoring**（CC 容器 npm registry 直连+mihomo 代理都不通）；已 gitignore 不入库。重建：Hermes 主机 `npm i tsx@4` 后 cp node_modules 进去（两边 node 22.23 / x86_64 二进制兼容）。
- `spec.json`(CommonMark 0.31.2, 652 用例) / `baseline.json` / `skip.json` 入库；`failures.txt` gitignore。
- **skip.json**：数据驱动「已知死循环」名单。run-spec.ts 读它跳过并标 HANG（**绝不 parse**，否则挂死整轮）。修好某死循环后从 skip.json 移除该 example。
- 5 类：EXACT(逐字节) / COSMETIC(仅空白差,归一化后等) / STRUCT(真结构差) / ERROR(抛异常) / HANG(已知死循环跳过)。
- 8.2 每修一批：CC 改 entry/ 解析器 → 重跑 harness → 对比 baseline.json 的 exactPct 增量。Hermes 审 diff + 修权限(`docker exec claude-code chown -R 1000:1000 .../tools`) + commit/push + 更新 baseline.json。
- ⚠️ CC 跑 tsx 撞到未跳过的死循环会把 `claude -p` 进程一起挂死——**新发现死循环先加进 skip.json 再让 CC 跑**。
- ⚠️ **harness(tsx) 不检查 ArkTS 严格模式规则**——解析器改动即使 harness 全过、数字漂亮，仍可能含 `arkts-no-untyped-obj-literals`(匿名对象字面量) 等违规、炸 DevEco 构建。**每批解析器改动 Hermes 审 diff 时必须按 CLAUDE.md ArkTS 规则人工核一遍**（重点：匿名对象字面量→具名 class+new、无 spread/Record/any/索引访问）。8.2c-1 真实踩过。

## ✅ 8.2b 开工提示（Emphasis — 已于本批完成，保留作算法参考）

> **已完成**：delimiter-run 算法已落地 `Inlines.ts`（具名 class `Delimiter`/`EmphasisProcessor` + charCode flanking helper），Emphasis 46→129/132，总 329→421，0 回归。spec: `.project/8.2b-emphasis-spec.md`。下面原始提示保留备查。

**开场**：「继续 TuiEditorHarmonyOS，做 8.2b Emphasis」。先读本文件 + status.md 恢复。

- **现状（要替换的代码）**：`commonmark/Inlines.ts` 的 `parseInlines` 里三处朴素配对——粗体 `**`/`__`(约 125-137)、删除线 `~~`(约 139-149，GFM，**保留**)、斜体 `*`/`_`(约 151-168)。全用 `text.indexOf(marker, ...)` 找最近的闭合标记，**没有 left/right-flanking 规则** → 把空格旁/标点旁的零散 `*`/`_` 误判成 `<em>`/`<strong>`（Ex351 `a * foo bar*`、Ex352 `a*"foo"*`、Ex353 `* a *` 都被错斜体）。
- **修法**：移植 CommonMark **delimiter-run 算法**——扫描时把 `*`/`_` 的 delimiter run 入栈，按 left-flanking/right-flanking（看两侧是否空白/标点）判定能否 open/close，配对时遵守 rule-of-three（open+close 长度和为 3 倍数的限制）、`_` 的 intraword 限制（词内 `_` 不成强调，`*` 可以）、`***`=强调+加粗 的嵌套。参考 tui.editor `libs/toastmark/src/commonmark/inlines.ts` 的 delimiter 处理。
- **⚠️ 最高回归风险**：现 Emphasis 已对 46/132，**别把已通过的改坏**。
- **严格 gate（亲跑核对，不信 CC 自报）**：① Emphasis 节明显↑(现 46/132)；② 总 exact ≥ 329 且上升；③ **务必做全节回归对比**（`git show HEAD:tools/commonmark-spec/baseline.json` vs 新跑的，因为 emphasis 是核心内联、波及面大）；④ error=0、无死循环；⑤ Code spans/Links/段落等不回归。
- **ArkTS**：禁匿名对象字面量(delimiter 栈项用具名 class，别 `{...}`——8.2c-1 炸过 DevEco)、禁 Record/索引访问、正则别用 `\\`。
- 流程同前：investigate failures.txt 的 [Emphasis] 样例 → 写 `.project/8.2b-emphasis-spec.md` → 派 CC → 亲验(harness+全节回归+ArkTS) → commit/push → 更新 .project。

## Checkpoint

**🎯 当前 = Phase 9.3 首帧主题修复【已实现·待真机验证】**（Phase 9.1 统一 + 9.2 跟随系统均真机通过 ✅）。
- **Phase 9.1 ✅ 真机已过**：12 个 `--ed-*` 变量统一三处暗色 + WYSIWYG 白线修复（commit 4d8851c）。
- **Phase 9.2 ✅ 真机已过**：bindMenu 三选一（浅/深/跟随系统）+ 系统亮暗自动同步，5 点全验过。编译期补修 `colorMode` 可选类型（commit 2b8c04d；`Configuration` 从 `@kit.AbilityKit` 导入 OK，无需改源）。
- **Phase 9.3 首帧主题修复 已实现待真机**：commit `d06dc48` push main。spec `.project/9.3-init-theme-fix-spec.md`。修 2 个真机发现的首帧 bug：① 启动页 `Index.ets` 没接 ThemeService（全硬编码浅色）→ 接入 + token 化 + 订阅 onThemeChange；② 首次进文档预览/编辑浅色（`opts.useDarkTheme` 硬编码 false + 首帧 this.theme 时机）→ useDarkTheme 取当前 isDark + Factory 后强制 `this.theme = getTheme()`。
  - 验证：系统深色冷启动 → 启动页即深色；首次进文档不切换 → 编辑/预览/外壳三处首帧即一致。
- 真机过后 **Phase 9（主题）全收官**。后续候选见 status.md Next（查找替换 / GFM spec 测试 / Phase 8 解析器剩余硬骨头 / 技术债清理[deprecated API+SDK12 守卫]）。

**Phase 9.1 做了什么（恢复用）**: 三处暗色（WYSIWYG tui dark.css / 预览 Renderer / 外壳 ArkUI）统一为 **12 个 `--ed-*` CSS 变量**，单一数据源 = ThemeService。改 5 文件：① `ThemeService.ts` +3 token(editorCodeBg/editorBorderSubtle/editorAccentHover) + `toCssVars()` 序列化(纯字符串拼接,ArkTS安全)；② `toastui-editor-dark.css` 全量变量化(134 处 `var(--ed-*,#fallback)`,零硬编码残留,base64 SVG/prism/保留 rgba 未动)；③ `editor.html` `setTheme(dark,varsCss)` 注入 `:root` 到 `#ed-theme-vars`；④ `WwEditor.ets` themeHandler/applyInitial 传 `theme.toCssVars()`；⑤ `Renderer.ts` renderFullPage 内联 `:root` + body 读 var。行内代码中性化、prism 语法色保留、base64 SVG 图标本批未动、跟随系统未做。审 diff 已过：ArkTS + 映射零误配 + 一致性(Renderer 内联值==toCssVars 产出)。

**Status（Phase 8 解析器存档）**: Phase 8.2 CommonMark exact **92.33%** (602/652)，用户暂停 spec 兼容。8.2j 完成、DevEco 编译通过、全节 0 回归。满分节 8 个（Emphasis/Autolinks/Raw HTML/Entity/HTML blocks/Fenced/ATX/List items）。无进行中批次。

**Resume — Phase 8 解析器（备用）**: 剩余 50 失败全硬骨头：Links bracket 栈(13,最难)/ref-def 8.2k(212/213/218)/Images(6)/tight-loose(4)/Tab(5)。⚠️ marker/块起始识别变化必须同步审 parseParagraph + isLazyContinuable break。审 diff 必过 ArkTS + 全节回归（亲跑回归脚本 + 净增量自洽 + hang=0）。
