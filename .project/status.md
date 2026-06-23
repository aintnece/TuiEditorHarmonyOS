# Project Status: TuiEditorHarmonyOS

**Last updated**: 2026-06-23 (Phase 6.3 字数统计强化(总行数) 代码完成 ⏳ 待真机验证。6.1+6.2 已验证 ✓)

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

**Phase 6.3 字数统计强化** — 代码完成 ⏳ 待真机验证。
- 仅改 `components/StatusBar.ets`：加 `lineCount` 字段 + `countLines`（空文档算 1，split('\n') 非正则）+ aboutToAppear/changeHandler 两处更新 + build() 显示「行数 N」（样式同字符/词数）。字符/词数本已实时，未动。
- spec: `.project/6.3-wordcount-spec.md`。真机验证点：多敲几行→「行数」实时增减、空文档显示 1、两模式都更新、字符/词数/光标行列仍正常。
- 6.3 其余候选（查找替换=独立大批次；更多对齐=不建议）仍待定。

### ✅ Phase 6.2 缩进 / 减少缩进（indent / outdent）— 真机验证通过（两模式）
- Toolbar.ets 加「缩进/减少缩进」两按钮（代码块后）；Editor.ts mapToTui Indent→indent / Outdent→outdent；MarkdownCommands.ts IndentCommand（行首+2空格）/ OutdentCommand（删行首 tab×1 或空格≤2，选区夹紧）+ 注册；新建 tui_indent.svg(右向)/tui_outdent.svg(左向)。commit c5d78d0。
- tui 引擎行为（已验证，非 bug）：indent/outdent 仅作用于列表项，普通段落被引擎禁用（无效属正常）；indent 需前置兄弟项才能嵌套；顶层列表项 outdent = 提升为段落。Markdown 模式则对任意行加减空格。
- Hermes 审查时修正：SVG 误放仓库根 → 移到 entry/src/main/resources/base/media/；indent 图标方向画反 → 改右向。spec: `.project/6.2-indent-outdent-spec.md`。

### ✅ Phase 6.1 标题级别 H1-H6 — 真机验证通过（两模式）
- Toolbar.ets 标题按钮改 bindMenu 下拉（H1-H6，content「标题 N」+ labelInfo「HN」），后端 mapToTui/HeadingCommand 本就支持级别参数未动。commit 5345e6d。spec: `.project/6.1-heading-levels-spec.md`。

## Next

- Phase 6.2: 缩进 / 减少缩进（indent / outdent，两模式）
- Phase 6.3: 其它（查找替换 / 字数统计 / 更多对齐，范围待定）
- 图片：可加 DocumentViewPicker（任意文件来源）+ 大图压缩/尺寸校验；pickStatus 错误文案可美化
- Phase 8: 解析器跑 CommonMark spec 测试套件

## Known Issues

- 图片插入目前仅支持 URL 文本输入，未接系统图库/文件选择器（待做，见 Next）
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
