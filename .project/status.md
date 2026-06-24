# Project Status: TuiEditorHarmonyOS

**Last updated**: 2026-06-24 (Phase 8.1 CommonMark spec 测试管线 + 基线完成。commit d233380 已 push。基线 exact 35.89% (234/652)。下一步 8.2 按失败聚类修复)

## Summary

Phase 1-4.8 完成。编辑器已具备：解析器 + EditorCore + Toolbar(含保存按钮 Feather SVG) + MdEditor + MdPreview + Splitter + LinkEditor + ImageEditor + PopupMenu + ContextMenu + SidePanel + StatusBar + ExportSheet + FileService(真实文件 I/O)。
**保存功能根因修复**：`fs.accessSync` 返回 boolean 不抛异常，旧代码恒判定文件存在导致 createFile 去重死循环。

## Completed

### Phase 1: 基础设施
- [x] DDD 追踪系统初始化（.project/）
- [x] EventEmitter 补全（emit bug fix + emitReduce + getEvents）
- [x] ThemeService 补全（28 颜色 Token + preferences + common.Context 类型修复）
- [x] I18n 补全（~110 key + 日/韩 + 英文回退 + 持久化）

### Phase 2: 解析器
- [x] ParseState + Blocks + Inlines + Gfm 四模块拆分
- [x] CommonMark 补全 + GFM 补全 + AST 类型补全
- [x] HtmlRenderer 补全（6 种新节点渲染 + String→string 类型修复）
- [x] ToastMark 重构为薄层入口

### Phase 3: EditorCore
- [x] EditorType / Selection / CommandManager / MarkdownCommands
- [x] EditorCore 主协调器 + Editor 入口类（Editor.factory()）
- [x] EditorPage 接入 Editor + app.ets 偏好初始化

### Phase 4
- [x] **4.1**: Toolbar 工具栏（22 按钮 + Feather Icons + bindPopup→Stack tooltip + 模式切换）
- [x] **4.2**: MdEditor 编辑器组件（TextArea + 行号标尺 + EditorCore 光标同步）
- [x] **4.3**: MdPreview 预览组件（WebView + runJavaScript 无闪烁更新 + KaTeX 本地拦截）
- [x] **4.4**: Splitter 可拖拽分栏（PanGesture delta 模式 + 像素宽度布局）
- [x] **4.5**: PopupMenu / LinkEditor / ImageEditor（链接/图片弹窗 + 表格操作菜单）
- [x] **4.6**: ContextMenu 右键菜单（6 项：复制/剪切/粘贴/全选/撤销/重做，pasteboard 剪贴板集成）
- [x] **4.7**: SidePanel + StatusBar + ExportSheet ✅ (编译通过)
- [x] **4.8**: EditorPage 完整集成（文件 I/O、新建/打开/保存/导出）✅

### Bug 修复
- [x] undo snapshot — CommandManager.undo() 改用全快照
- [x] bindPopup 移除 — 32px 按钮 bindPopup 需要双击；改为 Stack + position() 内联 tooltip
- [x] EditorContext 单例 — 解决 @Prop 无法传递 class 实例；全局 editorContext 单例
- [x] selection 回退 — lastSelectionStart/lastSelectionEnd 保存最后有效选区
- [x] Feather Icons — 16 个 SVG 图标替换文本标签
- [x] 诊断日志清理 — 移除所有临时 hilog 调试日志（7 文件清理完毕）
- [x] 保存按钮不可见 — `Button('💾')` emoji 不渲染，改用 Feather SVG
- [x] 保存按钮卡死 — `O_TRUNC=128` 错误值（应为 512），改用 `fs.OpenMode.TRUNC` 枚举
- [x] 保存按钮 UI 重构 — 从标题栏迁移至 Toolbar，统一 Feather SVG 风格（含 hover 态）
- [x] 保存功能根因 — `fs.accessSync` 返回 boolean 不抛异常（旧代码恒判定存在→createFile 死循环），真机验证通过
- [x] SidePanel 保存后刷新 — refreshToken @Prop+@Watch，保留当前文件高亮
- [x] TuiSave 诊断日志清理 — FileService(17处)+EditorPage(10处) 移除，保留 app.ets 正常日志

### Phase 5: WYSIWYG 模式（方案 B：WebView + tui.editor 引擎）
- [x] **5.1**: 引擎打包 — @toast-ui/editor v3.2.2 dist vendoring 到 `rawfile/tui-editor/`（min.js 350KB 含 ProseMirror + 主/暗 CSS，离线自包含）
- [x] **5.2**: WwEditor.ets WebView 容器 + `rawfile/tui-editor/editor.html` — 自定义域名 `https://wweditor.local` + onInterceptRequest 从 rawfile 加载、focusable(true) 可输入、`window.__ww` 桥 API、主题适配。**✅ 真机验证通过**（修了 2 个坑：onInterceptRequest 未剥 query → 白屏；选错 bundle externalize prosemirror → not a constructor，改用 uicdn -all 全打包版。均录入 Obsidian）
- [x] **5.3**: ArkTS↔JS 双向桥 — registerJavaScriptProxy(onChange 回写 core) + window.__ww.exec + runJavaScript 注入。**✅ 真机验证**（WYSIWYG 打字↔Markdown 同步）。修复链：加载误标脏(MdEditor/EditorCore/setMarkdown isDirty)、切模式误标脏(editor.html 窗口标志 programmaticSet+lastSetMd 抑制程序化 change)、内容串台(同源修复)
- [x] **5.4**: 模式切换 + 文件切换两向同步 — 由 applyInitial(读 core) + onChange(写 core) + @Prop@Watch loadToken(切文件重灌) 机制覆盖。**✅ 真机验证**（Md↔WYSIWYG 切换、WYSIWYG 下切文件即时更新、无串台）
- [x] **5.5**: Toolbar 联动 — WYSIWYG 下工具栏命令路由到 window.__ww.exec。**✅ 真机验证**。5.1 直接命令(Editor.exec 路由 + mapToTui)；5.2 Link/Image/Table(Editor.wysiwygExec + EditorPage 分流 addLink/addImage/addTable + payload class)；tooltip 用官方 bindPopup(hoveredTip===tip,{message,placement:Bottom,mask:false})替代被裁的 Stack+position。

**🎉 Phase 5 (WYSIWYG 模式) 全部完成并真机验证通过。**

### 图片插入：系统图库（方案 A）✅ 真机验证通过
- ImageEditor「从图库选择」→ PhotoViewPicker(@kit.CoreFileKit) 选图 → FileService.copyImageToSandbox（open uri 拿 fd + copyFileSync(srcFd,destFd)，**不能用 copyFileSync(uri,path)**——图库 media URI 不被接受）复制进 `filesDir/userimg/` → imageUrl 填相对 `userimg/<name>` → confirmImage 分流(WYSIWYG addImage / Markdown `![]()`) → WwEditor + MdPreview 拦截器 `userimg/` 分支从 filesDir 读出。两模式均显示。pickStatus 弹窗内可见反馈。

## In Progress

**（无活动批次）** — Phase 8.2d-1 完成，8.2d-2 / 8.2b 待选。

### ✅ Phase 8.2d-1 — 列表边界与编号 (commit f0acd8f, 已 push main)
- Blocks.ts 新增 `parseBulletMarker`/`parseOrderedMarker`(具名 class BulletMarker/OrderedMarker)；`isOrderedListMarker` 现在也认 `数字)`。`parseList` 记首项 marker 身份(无序 ch / 有序 delim+num)，marker 字符或分隔符变化即 break 分家，首行用 contentStart 剥离，捕获 `list.attrs.start`。Renderer.renderList 有序且 start≠1 输出 `<ol start="N">`。
- **基线 44.63% → 45.40%（exact 291→296，+5）**；Lists 4→6；List items 9/48 不回归；error 0；不挂；ArkTS grep 0 命中。Ex301(`-`/`+` 分家)、Ex302(`1.`/`3)` + start) 转正。
- **列表项内容模型本批未动**（多块/嵌套/tight-loose、Ex253/254 内容错位 → 留 8.2d-2）。spec: `.project/8.2d1-list-boundary-spec.md`。

### ✅ Phase 8.2c-2 — 引用式链接 + 链接引用定义 (commit ef14189, 已 push main)
- 新建 `commonmark/LinkRefs.ts`：`LinkRefDef`/`LinkRefStore` + `linkRefs` 单例（**Map** 非 Record，label 归一化 trim/折叠空白/小写，首个定义优先）。
- 两遍架构：`ToastMark.parse` 开头 `linkRefs.clear()` + 预扫全文收集单行定义 `[label]: dest "title"`（复用 8.2c-1 的 parseAngleDest/parseBareDest/parseTitle，已 export）；`Blocks.tryParseBlock` 段落兜底前检测定义行→消费(state.nextLine)+空节点(不渲染)；`Inlines.parseInlines` 给 `[`/`![` 加引用式回退 full `[t][l]`/collapsed `[t][]`/shortcut `[l]`。
- **基线 39.11% → 44.63%（exact 255→291，+36）**；Links 33→55；Link-ref-def 5→13；Images 6→11(引用式图片也解析了)；error 0；不挂。三方核对一致 + ArkTS grep 0 命中(具名 class/Map/无匿名字面量)。
- 未做（留后续）：多行定义、引用边角。spec: `.project/8.2c2-reference-links-spec.md`。

### ✅ Phase 8.2c-1 — 内联链接目标/标题解析重写 (commit 7728a7b, 已 push main)
- 重写 Inlines.ts `tryParseLinkOrImage` 的 destination/title 解析：尖括号目标 `<dest>`(剥括号/允许空格/反斜杠转义)、裸目标平衡括号、URL 字面空格→`%20`、严格 title(必须空白分隔+引号/括号，否则判非链接)。新增 7 个 helper，删 findClosingParen/findFirstSpace。
- **基线 36.96% → 39.11%（exact 241→255，+14）**；Links 22→33；Images 5→6(无回归)；error 0。三方核对一致(CC / __verify / Hermes 亲跑)。
- ⚠️ **踩坑（重要）**：CC 初版用匿名对象字面量返回 `{url,nextIdx}`——**违反 arkts-no-untyped-obj-literals，会炸 DevEco 构建**；但 tsx harness 不检查 ArkTS 规则，数字正常→违规漏网。Hermes 审 diff 抓到 → 让 CC 改具名 class DestResult/TitleResult。**今后每批解析器改动必须按 CLAUDE.md ArkTS 规则人工过一遍 diff（harness 通过 ≠ 能编进鸿蒙）**。spec: `.project/8.2c1-link-destination-spec.md`。
- 未做（留 8.2c-2）：引用式链接 `[text][ref]` / `[ref]:` 定义（Links 剩 57 + Link-ref-def 22 多为此，需 ref 定义表）。

### ✅ Phase 8.2a — 解析器快赢修复 (commit 775679b, 已 push main)
- 修 3 个 8.1 基线发现的 bug：① 图片 alt off-by-one（Inlines.ts:226 `bracketStart` start+2→start+1，不再吞首字符）；② **反斜杠/管道行死循环**（Blocks.ts 删 parseParagraph 第260行 pipe 守卫——含 `|` 非表格行不推进 state → parseBlocks 无限循环；**crash 级 bug 消除**）；③ Tabs 缩进代码块按列+tab展开（Blocks.ts 新增 countIndentColumns/stripIndent，制表位4）。
- harness：run-spec.ts 重写为**干净单线程版**（去掉之前 CC 过度设计的 worker/spec-worker.ts 子进程方案）；skip.json 清空（#12 已修，实测全 652 不再死循环）。
- **基线：35.89% → 36.96%（exact 234→241，+7）**；error 0；hang 0。三方交叉验证一致（__verify 临时脚本 / CC run-spec.ts / Hermes 亲跑提交版均 241）。
- 坦白：图片 alt 是真 bug，但 Images 多数用例**叠加其它差异**(URL归一化/title/实体/引用式)，只翻 4 条(1→5)，非"翻一片"——每用例常多因失败，后续聚类逐步累加。spec: `.project/8.2a-quickfix-spec.md`。

### ✅ Phase 8.1 — CommonMark spec 测试管线 + 基线 (commit d233380, 已 push main)
- 测试 harness 在 `tools/commonmark-spec/`（仓库根，**不进 hvigor 构建**）。跑法：`cd tools/commonmark-spec && ./node_modules/.bin/tsx run-spec.ts`（node_modules 由 Hermes 离线 vendoring——CC 容器 npm 无外网；两边 node 22.23/x86_64 二进制兼容）。
- `run-spec.ts`：652 用例跑 `ToastMark.parse → HtmlRenderer.renderBody`，分类 EXACT/COSMETIC/STRUCT/ERROR/HANG，输出分节表 + `failures.txt`(gitignore) + `baseline.json`。
- `skip.json`：数据驱动「已知死循环」跳过名单（修好后移除即可，无需改 runner）。
- **基线：exact 35.89% (234/652)**；COSMETIC 0；STRUCT 417；ERROR 0；**HANG 1**。spec 0.31.2 纯核心（不含 GFM 表格/删除线/任务列表，那是另一套 GFM spec）。
- **关键发现**：① Images 几乎全灭(1/22)根因＝**图片 alt 吞首字符**(off-by-one，"foo"→"oo")，单 bug 翻一片，最高 ROI；② **Example 12 反斜杠转义死循环**(crash 级，编辑器遇此输入卡死)；③ Tabs：`2空格+tab` 未识别为缩进代码块。
- 解析器代码**未改**(entry/ 不动)，修复留 8.2+。spec: `.project/8.1-commonmark-spec.md`。

---

### Phase 7（历史，下方 bullet 为当时记录）
**（无活动批次）** — Phase 7 代码语法高亮 ✅ 双模式真机验证通过（Batch A MdPreview + Batch B WYSIWYG）。
- 遗留设计议题（用户选择暂缓，见 active-task 暂缓区）：WYSIWYG/MdPreview 暗色用各自调色板，与应用 ThemeService 不完全一致；统一方案=注入 ThemeService 调色板覆盖 WebView CSS。系统深色(WebDarkMode.Auto/forceDark)不解决一致性、只跟随 OS。
- 仅改 `editor/markdown/MdPreview.ets`：PRISM_PREFIX + onInterceptRequest 的 prism/ 分支 + injectPrism()（主题感知暗/亮）+ doRender 首次 `Prism.highlightAll()` / 更新 `Prism.highlightAllUnder(article)`。代码块标记本就是 `language-xxx`，未动 Renderer。
- 资产 vendoring（Hermes）：`rawfile/prism/`（prism.js 核心+14语言；prism-tomorrow/light 主题）。spec: `.project/7a-codehl-mdpreview-spec.md`。
- **Batch B (WYSIWYG) 高亮+主题跟随 完成 ⏳ 待最终复验**：editor.html 注册 tui code-syntax-highlight 插件（守卫式 plugins 防白屏）+ Prism 主题 CSS（token 配色——插件自带 CSS 不含 .token 颜色，是首轮"无色"根因）+ setTheme 切 prism 暗色；WwEditor 加 stateChange 监听让 WYSIWYG 实时跟随主题切换（首轮"不跟随"的修复）。诊断脚手架已移除。语言往返保留（rt 自测确认）。spec: 7b-codehl-wysiwyg / 7b-fix-token-css / 7b-theme-follow。
- 真机验证点：Markdown 预览写带语言代码块→关键字着色；切暗/亮主题对应；改内容仍高亮。
- **首轮真机暴露 2 问题，已修并复验 ✓**：① 代码无色=vendoring 的 prism.js minified 直接 cat 粘连（`}()/**` → `/` 除号 + `**` 幂运算）语法坏，Hermes 加 `\n;\n` 分隔重拼（node 验证 OK）；② 主题按钮无反应=EditorPage 双重 toggle 抵消（已去重）+ MdPreview 不听 stateChange（已加监听整页重载，injectPrism 改读 core 权威主题解时序）。commit d145629。spec: `.project/7a-fix-theme-spec.md`。

### ✅ Phase 6.1 / 6.2 / 6.3 — 均真机验证通过（记录见下）

### ✅ Phase 6.3 字数统计强化 — 真机验证通过
- StatusBar.ets 加总行数（lineCount + countLines + 两处更新 + 显示）。commit 46a1661。Markdown 模式字符/词数/行数实时 ✓。
- **已知限制（暂缓）**：WYSIWYG 模式字符/词数/行数不实时，切回 Markdown 才同步（修需碰 Phase 5 的 change 回写路径，有 echo-loop 回归风险）。
- 撤销/重做：经确认两模式对**工具栏命令**均正常；打字不入撤销栈（设计限制，暂缓）。spec: `.project/6.3-wordcount-spec.md`。

### ✅ Phase 6.2 缩进 / 减少缩进（indent / outdent）— 真机验证通过（两模式）
- Toolbar.ets 加「缩进/减少缩进」两按钮（代码块后）；Editor.ts mapToTui Indent→indent / Outdent→outdent；MarkdownCommands.ts IndentCommand（行首+2空格）/ OutdentCommand（删行首 tab×1 或空格≤2，选区夹紧）+ 注册；新建 tui_indent.svg(右向)/tui_outdent.svg(左向)。commit c5d78d0。
- tui 引擎行为（已验证，非 bug）：indent/outdent 仅作用于列表项，普通段落被引擎禁用（无效属正常）；indent 需前置兄弟项才能嵌套；顶层列表项 outdent = 提升为段落。Markdown 模式则对任意行加减空格。
- Hermes 审查时修正：SVG 误放仓库根 → 移到 entry/src/main/resources/base/media/；indent 图标方向画反 → 改右向。spec: `.project/6.2-indent-outdent-spec.md`。

### ✅ Phase 6.1 标题级别 H1-H6 — 真机验证通过（两模式）
- Toolbar.ets 标题按钮改 bindMenu 下拉（H1-H6，content「标题 N」+ labelInfo「HN」），后端 mapToTui/HeadingCommand 本就支持级别参数未动。commit 5345e6d。spec: `.project/6.1-heading-levels-spec.md`。

## Next

**🎯 Phase 8.2 — 解析器修复**（按 ROI 排，每批 CC 修 → 重跑 harness → 用 baseline.json 量增量）：
- **8.2a 快赢** ✅ 完成（commit 775679b）：图片 alt off-by-one + 反斜杠/管道死循环(crash 消除) + Tabs 缩进。基线 35.89%→36.96%。详见 In Progress。
- **8.2b 强调/加粗**（Emphasis 86/132，最大簇）：补 CommonMark delimiter-run 算法。← **下一步候选（大工程/高风险）**
- **8.2c 链接** ✅ 完成：8.2c-1 内联目标(commit 7728a7b, Links 22→33) + 8.2c-2 引用式链接/定义(commit ef14189, Links 33→55, Link-ref-def 5→13)。剩余 Links/Link-ref-def 失败多为多行定义/边角，性价比低，暂缓。
- **8.2d 列表**：8.2d-1 边界+编号 ✅(commit f0acd8f, Lists 4→6, marker 分家 + ol start)；**8.2d-2 内容模型**（多块列表项、嵌套、tight/loose、修 Ex253/254 内容错位）← 下一步候选（较大/有风险）。
- **8.2e 零碎**：Entity refs(13) / Code spans(14) / Hard breaks(10) / HTML blocks(24) / Raw HTML(14) / Autolinks(9) / Setext(8) 等。

其它候选（与 Phase 8 并行或之后，待用户选）：
- **查找替换** — 搜索栏 + 高亮 + 上/下一处 + 替换（独立大批次，两模式各自实现）
- 其它 tui 官方插件：color-syntax / table-merged-cell / chart / UML
- **GFM spec 测试** — 表格/删除线/任务列表（另一套 GFM spec.json，本批未覆盖）
- 暂缓项（见 active-task 暂缓区）：WYSIWYG 实时字数、打字撤销
- 技术债：deprecated API（pushUrl/getParams/getContext）+ SDK12 守卫（clip/request）
- 图片增强：DocumentViewPicker（任意文件源）+ 大图压缩/尺寸校验

## Known Issues

- 图片插入已支持系统图库（方案A，真机验证 ✓）；DocumentViewPicker（任意文件源）+ 大图压缩 待做（暂缓）
- 解析器未跑 CommonMark spec 测试套件（Phase 8）
- `pushUrl` deprecated (2×) — 不阻塞编译（Index.ets）
- `getParams` deprecated — 不阻塞编译（EditorPage.ets）
- `clip` API SDK 12+ — 需要 bump compatibleSdkVersion 或 apiAvailable 守卫（MdEditor.ets）
- `request` API SDK 12+ — 同上（MdPreview.ets）
- `getContext` deprecated — 不阻塞编译（MdPreview.ets）
- Splitter `@Link splitRatio` 绑定语法修复：`$splitRatio`（非 `$this.splitRatio`）

## Reference Project

`F:\MarkdownEditor` — 完整 UI 组件资产库

## 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `.project/` | 新建 | DDD 追踪系统 |
| `event/EventEmitter.ts` | 修改 | invokeReduce 修复 |
| `services/ThemeService.ts` | 修改 | context 类型修复 |
| `i18n/I18n.ts` | 修改 | context 类型修复 |
| `parser/commonmark/Node.ts` | 修改 | alignments String→string |
| `parser/commonmark/Gfm.ts` | 修改 | aligns String→string |
| `parser/html/Renderer.ts` | 修改 | String→string 类型修复 |
| `editor/EditorCore.ts` | 修改 | Handler 类型修复 + 诊断日志清理 |
| `editor/Editor.ts` | 修改 | Handler + context 类型修复 |
| `editor/EditorContext.ts` | **新建** | 全局 editorContext 单例（@Prop 替代方案） |
| `editor/EditorType.ts` | 修改 | 新增 lastSelectionStart/lastSelectionEnd 字段 |
| `editor/markdown/MdEditor.ets` | **新建** | 行号标尺 + 光标同步 + 诊断日志清理 |
| `editor/markdown/MdPreview.ets` | **新建** | WebView 预览 + KaTeX + 诊断日志清理 |
| `editor/commands/commands/MarkdownCommands.ts` | 修改 | selection fallback + 诊断日志清理 |
| `components/Toolbar.ets` | 修改 | Editor 默认值修复 + onLink/onImage/onTable 回调 + Feather Icons + 诊断日志清理 |
| `components/Splitter.ets` | **新建** | PanGesture 可拖拽分栏（@Link splitRatio 绑定） |
| `components/LinkEditor.ets` | **新建** | 链接编辑弹窗（URL + 文本） |
| `components/ImageEditor.ets` | **新建** | 图片插入弹窗（URL + alt） |
| `components/PopupMenu.ets` | **新建** | 表格操作弹出菜单（9 项操作 + 中/英） |
| `components/ContextMenu.ets` | **新建** | 右键/长按上下文菜单（6 项 + pasteboard 集成） |
| `pages/EditorPage.ets` | 修改 | 集成三模式布局 + Splitter + 对话框 Stack 遮罩层 + 回调处理 + ContextMenu + 诊断日志清理 |
| `pages/Index.ets` | 修改 | 诊断日志清理 |
| `entry/src/main/module.json5` | 修改 | deliveryWithInstall + skills + 权限 |
| `resources/*/element/string.json` | 修改 | +2 权限说明 key |
| `resources/rawfile/katex/` | **新建** | KaTeX 完整资源（CSS/JS/字体） |
| `resources/base/media/tui_*.svg` | **新建** | 16 个 Feather Icons SVG（粗体/斜体/删除线/代码/标题/引用/列表/链接/图片/表格/分割线/代码块/任务/撤销/重做） |
| `editor/markdown/WwEditor.ets` | **新建** | Phase 5 WYSIWYG WebView 容器（tui.editor 引擎，onInterceptRequest 从 rawfile 加载，focusable(true)，window.__ww 桥） |
| `resources/rawfile/tui-editor/` | **新建** | Phase 5 引擎资产：toastui-editor.min.js(350KB) + toastui-editor.min.css + toastui-editor-dark.css + editor.html（离线初始化页） |
