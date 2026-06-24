# Project Status: TuiEditorHarmonyOS

**Last updated**: 2026-06-24 (Phase 8.2h 空列表项 完成。基线 exact 88.80% (579/652)，List items 32→38，全 26 节 0 回归)

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

**（无活动批次）** — Phase 8.2h 空列表项 完成（List items +6）。剩余多为列表前导空格 marker + 内容列模型（簇 B，下一批 8.2i）/ 深度 Tabs / 引用式边角。

### ✅ Phase 8.2h — 空列表项（empty list items，CommonMark 5.2 簇 A）
- `Blocks.ts` 只改一文件：(A) `parseBulletMarker` `<2`→`<1` + 空 marker 分支（marker 后 EOL 或 `isAllWhitespaceFrom`→contentCol=2）；(B) `parseOrderedMarker` 删旧「无空白→null」+ 空 marker 分支（分隔符后 EOL/全空白→contentCol=markerWidth+1）；(C) `parseList` 加 `isEmptyContentMarker` 判断实现「至多一个起始空行」（marker 行无内容时：下一行 blank/EOF→空项 appendChild+continue **不消费空行**；下一行非空→itemLines 留空进内容循环，空 firstContent 不推进避免误触发 loose）；(D) 新增 `isNonEmptyListMarker`（解析 marker 后看 contentCol 之后是否空白）+ `parseParagraph`/`isLazyContinuable` 改用它。无正则。
- **基线 87.88% → 88.80%（exact 573→579，+6）**；**List items 32→38**；**全 26 节 0 回归**（逐节净增量 +6=+6 自洽）；error 0；**hang 0**（空项不消费空行未引入死循环，parseBlocks blank 流正常）；cosmetic 0。6 条 oracle（278/279/280/281/283/284）全 PASS。
- ⚠️ **第三次「marker/标记识别变化 → 段落边界检测必须同步」联动**（8.2f 围栏 / 8.2g ATX / 8.2h 空 marker）。本批 D 项超 spec 范围（spec 写「不碰 parseParagraph」），但 CC 用 harness 跑出 Ex367 回归才补 `isNonEmptyListMarker`——**正确的 CommonMark 规则「空 list item 不能打断段落」**。语义分工（已验证自洽）：tryParseBlock 入口 + parseList 内容循环 break 用 `isBulletListMarker`/`isOrderedListMarker`（认空 marker，能启动/分项）；parseParagraph break + isLazyContinuable 用 `isNonEmptyListMarker`（不认空，不打断）。Hermes 全节回归验证零回归（Lists 17/Block quotes 24/Setext 26/Thematic breaks 18/Paragraphs 7 全不变，List items 现有 32 全保留）。**升级规则：marker/块起始识别逻辑任何变化（变严/变宽/加新形态），必须同步审 parseParagraph 推进循环 + isLazyContinuable 的对应 break 条件**。
- 三方核对一致（CC / Hermes 亲跑 harness=579 / 全节回归脚本 REGRESSIONS NONE + 净增量自洽）+ ArkTS grep 0 命中（isNonEmptyListMarker 复用具名 class/helper、字符串下标合法、无正则/匿名字面量/Record/spread/any/对象下标）。spec: `.project/8.2h-empty-list-items-spec.md`。

### ✅ Phase 8.2g — ATX headings（`#` 标题，CommonMark 4.2）
- `Blocks.ts` 只改一文件：入口第 45 行 `startsWith('#')` → `isAtxHeadingStart`；新增具名 class `AtxOpen` + 2 helper（`parseAtxOpen`：前导空格≤3 + `#` run 1-6 + run 后须 空格/Tab/行尾，否则 null；`isAtxHeadingStart`）；重写 `parseHeading`（用 parseAtxOpen 取 level/contentStart、内容首尾去空格Tab、闭合 `#` 序列仅当其前是 空格/Tab 或即整个内容才剥除）。无正则。
- **基线 86.96% → 87.88%（exact 567→573，+6）**；**ATX headings 12→18 满分**；**全 26 节 0 回归**（逐节净增量 +6=+6 自洽）；error 0；hang 0；cosmetic 0。6 条必查样例（63/64/68/71/75/76）全 PASS。
- ⚠️ **教训：spec 缺陷被 CC 正确纠偏（可复用模式）**。spec 明确写「不碰 parseParagraph」，但 CC 改了第 568 行 parseParagraph 的 `startsWith('#')` → `isAtxHeadingStart`，理由正确：parseParagraph 是「先检查 break 后收行」结构，入口变严后被拒的非标题 `#` 行（`#######`(7个)/`#foo`(后无空格)）落到 parseParagraph，若 break 条件仍用旧 `startsWith('#')` 会「break 但无块消费→state 不推进→**死循环**」（与 8.2f 围栏同款联动陷阱）。Hermes 审 parseParagraph 结构确认必要 + 全节回归验证零回归（Setext 26/Paragraphs 7/Block quotes 24/Thematic breaks 18 全不变）。**今后「入口检测变严」类改动（startsWith→语义校验）必须同步检查 parseParagraph 推进循环的 break 条件，否则被拒行死循环**。其余 3 处（setsParaOpen/isLazyContinuable/isNonListBlockStart）不在推进循环，保持 startsWith 不动安全。
- 三方核对一致（CC / Hermes 亲跑 harness=573 / 全节回归脚本 REGRESSIONS NONE + 净增量自洽）+ ArkTS grep 0 命中（AtxOpen 具名 class、字符串下标合法、无正则/匿名字面量/Record/spread/any/对象下标）。spec: `.project/8.2g-atx-headings-spec.md`。

### ✅ Phase 8.2f — Fenced code blocks（围栏代码块满分，CommonMark 4.5）
- `Blocks.ts` 重写围栏解析：新增具名 class `FenceInfo` + 4 helper——`parseCodeFenceOpen`（前导空格≤3 + run 长度≥3 + backtick 围栏 info 禁含 backtick → 返回 null 回退）/ `isCodeFenceStart` / `isClosingFence`（同 char run ≥ 开围栏长度 + 其后仅尾随空白 + ≤3 缩进）/ `stripFenceIndent`（内容去开围栏缩进量）；重写 `parseCodeBlock`（run 长度精确计数 + info 起点正确 + 闭合判定 + 内容去缩进）。入口第 41 行 + **3 处段落边界检测**（`setsParaOpen`/`isLazyContinuable`/`parseParagraph`）的 `startsWith` 三连判断统一换 `isCodeFenceStart`（修正：原来任何 backtick/tilde 开头行都打断段落，现只有**合法围栏**才打断 → backtick-in-info 行如 `` ``` ``` `` 不再错误打断段落、带 ≤3 空格围栏正确打断）。`Renderer.ts` 的 `renderCodeBlock` language class 从整段 info 改为取**第一个空白分隔 token**（字符循环找首个空格/Tab）。无正则。
- **基线 84.51% → 86.96%（exact 551→567，+16）**；**Fenced code blocks 14→29 满分**、**Code spans 20→21**（Ex138/145 backtick-in-info 行回退为行内 code span）；**全 26 节 0 回归**（逐节净增量 +15/+1=+16 与总增量完全一致）；error 0；hang 0；cosmetic 0。15 条必查样例（124/125/127/131/132/133/135/136/138/139/143/144/145/146/147）全 PASS。
- 三方核对一致（CC 自报 / Hermes 亲跑 harness=567 / 全节回归脚本 REGRESSIONS NONE + 逐节净增量自洽）+ ArkTS grep 0 命中（FenceInfo 具名 class、`line[i]`/`info[k]` 字符串下标合法、无正则/匿名字面量/Record/spread/any/对象属性下标）。⚠️ CC 超 spec 范围改了 3 处段落边界检测（防 backtick-in-info 行错误打断段落），Hermes 全节回归确认安全（Setext 26/Block quotes 24/Paragraphs 7/Lists 17/List items 32 全不变）。spec: `.project/8.2f-fenced-code-spec.md`。**DevEco 真机编译通过 ✅（ArkTS 严格模式终验无违规）。**

### ✅ Phase 8.2Ex175 — tight list 内块级子节点换行（CommonMark 5.2/5.3）
- `Renderer.ts` 的 `renderListItemChildren`：tight 模式下、**非段落块级子节点**（HtmlBlock/嵌套 List/CodeBlock/BlockQuote/Heading/ThematicBreak）前补**条件换行**（`result` 为空或不以 `\n` 结尾时补一个 `\n`）。tight 段落 unwrap 分支 + loose 全不动。仅 3 行（else 分支）。
- **基线 82.67% → 84.51%（exact 539→551，+12，本会话最大单批）**；**HTML blocks 43→44 满分**、**List items 25→32（+7）**、**Lists 14→17（+3）**、Thematic breaks 17→18（连带）；**全 26 节 0 回归**（逐节 +1/+7/+3/+1=+12 一致）；error 0；hang 0；cosmetic 0。Ex175 PASS。
- 经验：原估 +1，实为 +12——**渲染层「块级子节点前缺条件换行」是单点系统性 bug，嵌套 tight 列表（`- a\n  - b` 的 `<li>a\n<ul>`）大量连带转正**。低估了渲染结构性修复的连带面。
- 三方核对一致（CC / Hermes 亲跑 harness=551 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（`result[result.length-1]` 字符串下标合法、无正则/匿名字面量/Record/对象属性下标）。spec: `.project/8.2Ex175-tight-list-block-child-spec.md`。

### ✅ Phase 8.2G2 — 实体解码接入 dest/title/info（CommonMark 2.5 横切）
- `Inlines.ts` 新增 `export function unescapeString`（单趟反斜杠转义 + 实体解码，复用 `tryParseEntity` + `isEscapable`，修正旧的「先全反斜杠再实体」两趟会错解 `\&amp;` 的隐患）；把 `parseAngleDest`/`parseBareDest`/`parseTitle` 内 6 处 `resolveBackslashEscapes` 换成 `unescapeString`（dest+title，inline 与 ref-def 共享解析器 → 两边同时生效）；`tryParseLinkOrImage` 去掉对 urlRaw 的冗余二次 resolve（只留 normalizeUri，顺手消除双重 backslash 处理）。`Blocks.ts` 顶部 import 加 `unescapeString`，`parseCodeBlock` 的 info 改 `unescapeString(...)`。label(1338) + ref-def 路径未动（label 不解码实体）。无正则。
- **基线 81.75% → 82.67%（exact 533→539，+6）**；**Entity 14→17 满分**、**Links 67→69**、**Backslash escapes 12→13**；**全 26 节 0 回归**（逐节 +3/+2/+1=+6 一致）；error 0；hang 0；cosmetic 0。Ex32/33/34 全 PASS（dest+title 实体解码 + ref-def 免费修 + info string）。
- 三方核对一致（CC 本批自报准确 / Hermes 亲跑 harness=539 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（无正则/匿名字面量/Record/对象下标）。spec: `.project/8.2G2-entity-dest-title-info-spec.md`。

### ✅ Phase 8.2G1 — 命名实体表 + 文本解码（CommonMark 2.5）
- **Hermes vendoring**：新增 `commonmark/HtmlEntities.ts` —— 从 WHATWG entities.json 生成 2125 个 `;` 结尾 HTML5 命名实体，打包成 `export const HTML_ENTITY_PACKED`（`name=cp[,cp...]` 分号分隔、十进制码点、纯 ASCII、27.5KB；含多码点如 `ngE=8807,824`）。纯数据资产，无逻辑。
- **CC（只改 Inlines.ts）**：import `HTML_ENTITY_PACKED`；新增惰性 `Map<string,string>` 构建 `getNamedEntityMap`（split 解析、多码点 for 循环 `+= String.fromCodePoint`、**无 spread**）+ `lookupNamedEntity`；`tryParseEntity` 命名分支从 6 个硬编码 if 换成全表查找（name = & 与 ; 之间，名长 1..32）。数字分支不动。修正旧 bug：`&nbsp;` 从普通空格(32)改为真 NBSP(160)。无正则、用 Map 非 Record。
- **基线 81.60% → 81.75%（exact 532→533，+1）**；**Entity 13→14**（Ex25：`&copy;`/`&AElig;`/`&Dcaron;`/`&frac34;`/`&HilbertSpace;`/`&DifferentialD;`/`&ClockwiseContourIntegral;`/`&ngE;`(2 码点) 等全解码）；**全 26 节 0 回归**（+1=+1 一致）；error 0；hang 0；cosmetic 0。Ex32/33/34 仍 FAIL（dest/title/info，留 G-2，确认未回归）。+1 偏小属预期（Ex25 是唯一纯文本实体失败例，表的大头在 G-2）。
- 三方核对一致（CC / Hermes 亲跑 harness=533 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（Map 非 Record、无 spread、无正则、无匿名对象字面量、无对象属性下标；HtmlEntities.ts 纯 export const string）。spec: `.project/8.2G1-named-entities-text-spec.md`。

### ✅ Phase 8.2Img — 图片 alt 纯文本化（CommonMark 6.4 Images）
- `Inlines.ts` 修图片 alt：旧实现 `attrs.alt = result.text`（原始括号 markdown），改为 `extractAltText(result.text)`——新增 `plainTextOf`(遍历子树取纯文本：Text/Code/HtmlInline→text、Image→attrs.alt、Soft/HardBreak→`\n`、Emph/Strong/Strike/Link 等容器递归) + `extractAltText`(parseInlines 进临时节点 → plainTextOf)，行内图片(约95)+引用式图片(约106)两处创建均改用。Renderer 未动（仍读 attrs.alt，现为纯文本）。无正则。
- **基线 80.83% → 81.60%（exact 527→532，+5）**；**Images 11→16/22**（574 嵌套图片 alt 取其 alt / 575 链接只留文字 / 576 collapsed 引用强调剥除 等）；**全 26 节 0 回归**（增量全在 Images，逐节 +5=+5 一致）；error 0；hang 0；cosmetic 0。3 个必查样例(574/575/576)全 PASS，Ex573(shortcut-ref 图片未识别) 仍 FAIL（预存未回归，属引用式解析路径）。
- 三方核对一致（CC / Hermes 亲跑 harness=532 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（无正则/无匿名对象字面量/无 Record/无对象属性下标，仅改 Inlines.ts）。spec: `.project/8.2Img-image-alt-plaintext-spec.md`。

### ✅ Phase 8.2B — Block quote 懒段落续行（CommonMark 5.1）
- `Blocks.ts` 给引用块加 lazy paragraph continuation：新增 `blockQuoteMarkerStrip`(跳 ≤3 前导空格 + `>` + 1 可选空格，返回 `string|null` 联合类型非对象字面量) + `isBlockQuoteStart` + `setsParaOpen`(blank/`#`/围栏/分割线→false，余 true 乐观，含嵌套 `>` 行) + `isLazyContinuable`(非 `>` 行能否懒续段落：blank/缩进≥4/`#`/围栏/分割线/`>`/HTML 块/列表标记→false)；重写 `parseBlockQuote`（`paraOpen` 追踪 + 非 `>` 行满足 `paraOpen && isLazyContinuable` 时原样收为懒续行 + 纯空白 rest 归一为空行）；`tryParseBlock` 入口改 `isBlockQuoteStart`。嵌套靠 setsParaOpen 对 `>` 行乐观置真 + 递归逐层收口（`>>> foo\nbar\n>>baz` 验证正确）。**不动 parseParagraph / 列表打断规则。** 无正则。
- **基线 79.45% → 80.83%（exact 518→527，+9）**；**Block quotes 17→24/25**（仅剩 Ex238：`> foo\n    - bar` 缩进懒续行需碰 parseParagraph 列表打断缩进规则，已显式延后）/ **List items 23→25**（懒续行连带）；**全 26 节 0 回归**（逐节 +7/+2=+9 与总增量一致）；error 0；hang 0；cosmetic 0。7 个必查样例(230/232/233/241/247/250/251)全 PASS，Ex238 仍 FAIL（预存未回归）。
- 三方核对一致（CC 自报 List items「不变」实为 +2，**Hermes 亲跑 harness=527 + 全节回归脚本逮到真增量** / REGRESSIONS NONE）+ ArkTS grep 0 命中（无正则/无匿名对象字面量/无 Record/无对象属性下标，parseParagraph 未动）。spec: `.project/8.2B-blockquote-lazy-spec.md`。

### ✅ Phase 8.2A — Setext headings（下划线式标题，CommonMark 4.3）
- `Blocks.ts` 四处改：① `isSetextUnderline`→`setextUnderlineType`(返回 0/1/2：允许 0-3 前导空格、连续 `=+`/`-+` run、其后仅尾随空白；4+ 前导空格→0)；② `parseParagraph` setext 前瞻改用它、level 取返回值、标题内容过新 helper `stripTrailingSpacesTabs`（去尾随空格/制表，修标题尾随空白进内容）；③ `isThematicBreak` 加 `countIndentColumns>=4 → false` 守卫（缩进≥4 非分割线）；④ 新增 `stripTrailingSpacesTabs`。只改 Blocks.ts。无正则。
- **基线 78.22% → 79.45%（exact 510→518，+8）**；**Setext headings 20→26/27**（仅剩 Ex93：`> foo\nbar\n===` 需 blockquote 懒段落续行，属引用块架构，非本批）/ **Thematic breaks 15→17**（缩进守卫连带：`    ***`/`    ----` 不再误判 hr）；**全 26 节 0 回归**（逐节 +6/+2=+8 与总增量一致）；error 0；hang 0；cosmetic 0。6 个必查样例(82/84/86/87/88/89)全 PASS。
- 三方核对一致（CC / Hermes 亲跑 harness=518 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（无正则/无匿名对象字面量/无 Record/无对象属性下标，仅改 Blocks.ts）。spec: `.project/8.2A-setext-headings-spec.md`。

### ✅ Phase 8.2e — HTML blocks（块级原始 HTML，CommonMark 4.6 七型）
- `Blocks.ts` 重写 HTML 块：旧实现对所有类型一律「遇空行结束 + 全块 `.trim()`」（仅 type6/7 正确），且 type6 名单错混入 pre/script/style。新实现按 commonmark.js 0.31.2 的 7 型分类 + 各自结束条件：新增 `htmlBlockStartType`(返回 1-7) + `matchHtmlTagNameType`(提取 tagname 精确匹配 type1/type6 名单 + 终止符判定，type1 终止符不含 `/`、type6 含) + `isType6Name`(具名 `string[]` 名单，含 `search` 无 `source`) + `htmlBlockCloseMatch`(type1 lc.indexOf `</script>` 等 / 2:`-->` / 3:`?>` / 4:`>` / 5:`]]>`) + `isHtmlBlockInterrupt`(type1-6，type7 不打断段落) + helper `isAllWhitespaceFrom`/`isBlankLine`/`isAsciiLetterCh`/`isAsciiAlnumCh`。type1-5 含中间空行直到结束标记或 EOF；type6-7 遇空行结束（空行不计入）。内容 `lines.join('\n')` **不 trim**。type7 复用 `Inlines.parseHtmlOpenTag`/`parseHtmlCloseTag`（仅加 `export`，逻辑未改）+ 整行仅空白校验。`parseParagraph`/`isNonListBlockStart` 两处打断点改 `isHtmlBlockInterrupt`；`tryParseBlock` 入口仍用全 1-7 的 `isHtmlBlockStart`。无正则。
- **基线 74.39% → 78.22%（exact 485→510，+25，本会话最大单批之一）**；**HTML blocks 22→43/44**（仅剩 Ex175：tight list 内 HtmlBlock 子节点需 `renderListItem` 补前导 `\n`，属 Renderer 层，预存非回归）/ **Raw HTML 18→20 满分** / Entity 12→13 / Backslash escapes 11→12 连带；**全 26 节 0 回归**（逐节增量 +21/+2/+1/+1=+25 与总增量一致）；error 0；hang 0；cosmetic 0。22 个必查样例 21 PASS（仅 Ex175 FAIL，预存）。
- 三方核对一致（CC / Hermes 亲跑 harness=510 / 全节回归脚本 REGRESSIONS NONE）+ ArkTS grep 0 命中（无正则/无匿名对象字面量/无 Record/无对象属性下标，`Renderer.ts`/`Node.ts` 未动）。spec: `.project/8.2e-html-blocks-spec.md`。

### ✅ Phase 8.2e-6 — inline Raw HTML（行内原始 HTML 标签）
- 新增 `HtmlInline` 节点：`Node.ts` 枚举加 `HtmlInline='htmlInline'`；`Renderer.ts` 加 `case HtmlInline: return node.text`（逐字不转义）；`Inlines.ts` 在 `<` 分支 autolink 之后接入 `tryParseHtmlTag`（命中产 HtmlInline 节点）。新增 6 种产生式 char-loop 解析 `parseHtmlOpenTag`/`parseHtmlCloseTag`/`parseHtmlComment`/`parseHtmlPI`/`parseHtmlDeclaration`/`parseHtmlCdata` + helper `isHtmlWs`/`isAttrNameStart`/`isAttrNameChar`/`isUnquotedValueChar`/`skipHtmlWs`。引号感知（属性值用 `indexOf` 找闭合引号，引号内 `>` 不当结束）。无正则。
- **基线 71.01% → 74.39%（exact 463→485，+22，本会话最大单批）**；**Raw HTML 6→18** / **Emphasis 129→132 满分**（Ex475/476/477 因 `<...>` 不再被错转义、内部 `*` 不入 delimiter）/ Hard line breaks 12→14（Ex642/643）/ HTML blocks 20→22 / Links 65→67 / Code spans 19→20 连带；**全 26 节 0 回归**；error 0；hang 0。spec 第六节 12 条必过样例全 PASS。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则/无匿名对象字面量/返回 number 索引）。Ex623/624（被块级 HTML 吞，属 Blocks 层）未翻、未回归。spec: `.project/8.2e6-inline-raw-html-spec.md`。

### ✅ Phase 8.2e-5 — normalizeURI（URL 百分号编码，横切）
- `Inlines.ts` 新增 `normalizeUri`（mdurl.encode 语义：保留 alnum + 安全标点 `;/?:@&=+$,-_.!~*'()#` + 已有 `%XX`(keepEscaped)，其余按 **UTF-8 字节**百分号编码，含 surrogate pair → astral）+ helper `isUriSafePunct`/`uriHexByte`/`pctEncodeCodePoint`（复用 `isAsciiAlnum`/`isHexDigit`，无正则）。把 3 处 `encodeSpacesInUrl`（内联 dest 601 + ref-def dest 1143/1151）换成 `normalizeUri`；autolink URI/email href 也过 `normalizeUri`。`encodeSpacesInUrl` 定义保留（不再调用）。
- **基线 69.79% → 71.01%（exact 455→463，+8）**；Links 62→65 / Link reference definitions 14→16 / Autolinks 18→**19(满分)** / Code spans 18→19 / Backslash escapes 10→11；**全 26 节 0 回归**（横切 URL 管线无任何节下降）；error 0；hang 0。spec 第六节必过样例全 PASS（Ex502 `\`→%5C / Ex504 `"`→%22 / Ex507 NBSP→%C2%A0 / Ex603 `\[\`→%5C%5B%5C）。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则/无匿名对象字面量）。双因用例 Ex503/Ex32/Ex33 维持 STRUCT（`&auml;`/`&ouml;` 需命名实体表解码，`%20` keepEscaped 已正确保留），未回归。spec: `.project/8.2e5-normalize-uri-spec.md`。

### ✅ Phase 8.2e-4 — Hard line breaks（反斜杠换行 + 换行前尾随空格剥离）
- `Inlines.ts` 换行处理三分支：① 转义分支加 `\`+`\n` → HardBreak + 跳下一行行首空格；② 删独立的双空格硬换行分支；③ 重写 `\n` 分支——弹出 `out` 末尾连续单空格 Text 节点计数，`spaceCount>=2`→HardBreak 否则 SoftBreak，再跳下一行行首空格（递归安全，对每个行尾统一处理）。无正则。
- **基线 68.87% → 69.79%（exact 449→455，+6）**；Hard line breaks 节 **9→12**；连带 Links +1(Ex556) / Backslash escapes +1 / Soft line breaks +1（换行前尾随空格剥离把 2 条 COSMETIC 转 EXACT，**cosmetic 归零**）；**全 26 节 0 回归**；error 0；hang 0。spec 第五节必过样例全 PASS（Ex634/637/639/556）。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则/无匿名对象字面量）。Hard breaks 仅剩 Ex642/643(inline raw HTML) / Ex645(块末尾尾随空格需 Blocks 层 trim)，均不在本批、未回归。spec: `.project/8.2e4-hardbreaks-spec.md`。

### ✅ Phase 8.2e-3 — Autolinks（`<scheme:uri>` / `<email>` 严格识别）
- `Inlines.ts` 自动链接从粗糙 `isAutolink`（只认 http/https/ftp/mailto + 任意 `@`）换成 CommonMark 标准：删 `isAutolink`，新增 char-loop 校验 `isAsciiLetter`/`isAsciiDigit`/`isAsciiAlnum`/`isUriAutolink`(scheme 首字母 + `[A-Za-z0-9+.-]`、长 2-32、跟 `:`、rest 拒空白/`<`/控制符) / `isEmailAutolink`(local 严格字符集 + `@` + domain 各 label alnum 头尾、`split('.')`)。分支先试 URI(url=inner)、再试 email(url=`mailto:`+inner)、都不成立 `<` 留字面。无正则。
- **基线 67.64% → 68.87%（exact 441→449，+8）**；Autolinks 节 **10→18**；**全 26 节 0 回归**；error 0；hang 0。spec 第六节 8 条必过样例全 PASS（Ex596/598/599/601/602/604/605/606）。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则/无匿名对象字面量）。Autolinks 仅剩 Ex603（href 需 normalizeURI 百分号编码 `%5C%5B%5C`，横切功能留单独批次，未回归）。spec: `.project/8.2e3-autolinks-spec.md`。

### ✅ Phase 8.2e-2 — Entity 数字字符引用（十进制 + 十六进制）
- `Inlines.ts` 的 `tryParseEntity` 数字分支从返回占位符 `'?'` 的桩换成 CommonMark 标准解码：十进制 `&#NN;`(1-7位) + 十六进制 `&#xHH;`/`&#XHH;`(1-6位) + 合法性(位数/结尾分号/非数字字符) + U+FFFD 规则(码点 0/>0x10FFFF/代理区 → `\uFFFD`) + `String.fromCodePoint` 真解码。`tryParseEntity` 改返回具名类 `EntityResult{value,nextIdx}`，顺带把实体分支脆弱的 `indexOf` rough-estimate 推进改成 `i=er.nextIdx`。新增 `isDecimalDigit`/`isHexDigit`(charCode，无正则)。保留现有 6 个命名实体不动。
- **基线 66.56% → 67.64%（exact 434→441，+7）**；Entity 节 **5→12**；**全 26 节 0 回归**；error 0；hang 0。spec 第七节 7 条必过样例全 PASS（Ex26/27/28/37/38/39/40）。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则、无匿名对象字面量、具名 class）。Entity 剩 5 条不在本批：Ex25/32/33/34(命名实体大表 + 链接 dest/title/info-string 上下文) / Ex31(raw HTML)。spec: `.project/8.2e2-entity-numeric-spec.md`。

### ✅ Phase 8.2e-1 — Code spans（行内代码反引号 run 等长匹配）
- `Inlines.ts` 行内代码分支从朴素单反引号 `indexOf` 升级为 commonmark.js `parseBackticks` 算法：开 run 长度 openLen → 找第一个等长闭 run（长度不符的 run 跳过）→ 内容换行(`\n`/`\r`)转单空格 + 首尾各剥一个 U+0020（仅当含非空格且首尾都是空格）→ 无闭合则开 run 留字面、仅推进过开 run。新增纯函数 `codeSpanNewlinesToSpaces` / `codeSpanHasNonSpace`（字符循环，无正则）。只改这一个分支 + 2 helper。
- **基线 64.57% → 66.56%（exact 421→434，+13）**；Code spans **9→18/22**；Hard line breaks 7→9（code span 内 newline/反斜杠 Ex640/641）；连带 Backslash escapes +1 / Fenced code blocks +1；**全 26 节 0 回归**；error 0；hang 0。spec 第六节 11 条必过样例全 PASS。
- 三方核对一致（CC / Hermes 亲跑 harness / 全节回归脚本）+ ArkTS grep 0 命中（无正则、无匿名对象字面量）。Code spans 剩 4 条 STRUCT 不在本批：Ex342(code-vs-link 优先级，需 bracket 模型) / Ex344(raw-HTML 交互) / Ex346(autolink 交互) / Ex347(块级 fenced 抢吃，属 Blocks.ts)。spec: `.project/8.2e1-code-spans-spec.md`。

### ✅ Phase 8.2b — Emphasis / Strong（CommonMark delimiter-run 算法）
- 把 `Inlines.ts` 三处朴素 `indexOf` 配对（粗体 `**`/`__` + 斜体 `*`/`_`）替换成 commonmark.js 0.31.2 的 delimiter-run 算法：`scanDelims`(left/right-flanking + `_` 词内限制) → 入 delimiter 栈 → `EmphasisProcessor.process()`(openers_bottom + rule-of-three + `***` 嵌套)。删除线 `~~` 分支保留。
- **架构适配**：`parseInlines` 改成「收集到本地 `out: AstNode[]` + delimiter 双向链栈，末尾 `process()` 再挂到 parent」。本项目 `AstNode` 无 commonmark 的链表 API → 节点搬移用 `out` 数组 `indexOf`+`splice`（按对象身份，抗下标漂移）。新增具名 class `Delimiter`/`EmphasisProcessor` + charCode helper `isUnicodeWhitespace`/`isAsciiPunct`/`isPunctuation`（避开 ArkTS 正则）。`openersBottom` 用数组（数组下标 ArkTS 合法）。
- **未加 bracket 栈**：链接走 `tryParseLinkOrImage` 对内文递归 `parseInlines`，链接内强调天然独立作用域 → Ex419/473/478/480 边界交互自然通过。
- **基线 50.46% → 64.57%（exact 329→421，+92）**；Emphasis 节 **46→129/132**（仅剩 Ex475-477 inline raw HTML 标签未支持，属 8.2e 独立功能，非算法问题）；连带 Links +5 / Code spans +1 / Hard line breaks +1 / Setext +1 / Thematic breaks +1；**全 26 节 0 回归**；error 0；hang 0。spec 第七节 20 条必过样例全 PASS。
- 三方核对一致（CC 自报 / Hermes 亲跑 harness / 全节回归对比脚本）+ ArkTS grep 0 命中（匿名对象字面量/Record/spread/新正则均 0，具名 class+new）。spec: `.project/8.2b-emphasis-spec.md`。

### ✅ Phase 8.2d-2 — 列表项内容模型重写 (commit d1567a0, 已 push main)
- 重写 `parseList` 内容收集：按列去缩进 W（marker 后空格数 1-4→+s / ≥5→+1）把整项内容收进 `itemLines` **保持顺序**，走**单一 `parseBlocks` 路径**（删掉原先单独的 `parseInlines(itemText)` 追加——Ex254 首行甩到末尾的顺序 bug 根因）。新增 helper countWhitespaceFrom/substringByColumn/stripIndentCols/isNonListBlockStart。
- tight/loose 判定（项间或项内非尾部空行→loose），同步到 `item.attrs.tight`；`Renderer.renderListItem` tight 时对直接子 Paragraph 解包（不包 `<p>`），loose 照旧。`Node.ts` 加 `AstAttrs.tight`。
- **基线 45.40% → 50.46%（exact 296→329，+33，过半！）**；List items 9→23；Lists 6→14；Paragraphs 4→7；缩进代码 7→9；**全 26 节 0 回归**（另 6 节连带各 +1）；error 0；不挂；ArkTS grep 0 命中。Ex253/254/255 + tight/loose 样例全对。spec: `.project/8.2d2-list-content-spec.md`。

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
- **8.2b 强调/加粗** ✅ 完成（CommonMark delimiter-run 算法，commit 见下）：基线 50.46%→64.57%（exact 329→421），Emphasis 节 46→129/132，全 26 节 0 回归。详见 In Progress。
- **8.2c 链接** ✅ 完成：8.2c-1 内联目标(commit 7728a7b, Links 22→33) + 8.2c-2 引用式链接/定义(commit ef14189, Links 33→55, Link-ref-def 5→13)。剩余 Links/Link-ref-def 失败多为多行定义/边角，性价比低，暂缓。
- **8.2d 列表** ✅ 完成：8.2d-1 边界+编号(commit f0acd8f) + 8.2d-2 内容模型(commit d1567a0)。List items 9→23，Lists 6→14。剩余多为缩进/懒续行边角，性价比低，暂缓。
- **8.2e 零碎**（剩余最大杠杆，逐子簇累加）：✅ **8.2e-1 Code spans**、**8.2e-2 Entity 数字**、**8.2e-3 Autolinks**、**8.2e-4 Hard breaks**、**8.2e-5 normalizeURI**、**8.2e-6 inline Raw HTML**（Raw HTML 6→18、Emphasis 满分）已完成（commit 见下）。Emphasis/Autolinks 节已满分。待选子簇：命名实体大表(Ex25/32/33/34 + dest 双因) / HTML blocks(块级 7 型起始条件，最大功能) / Setext(7，块级) / Ex623/624(块级 HTML 吞)/Ex645(块末尾 trim)。**剩余多为块级（Blocks.ts）大功能**，行内快赢基本做完。
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
