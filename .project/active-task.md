# Active Task

## ✅ 已完成（详见 status.md）

- **Phase 1-4.8**：解析器 + EditorCore + Markdown 编辑/预览 + 文件 I/O，全部真机验证。
- **Phase 5 (WYSIWYG)**：引擎(@toast-ui/editor v3.2.2 **-all 全打包版**)/WwEditor WebView 容器/离线加载/ArkTS↔JS 双向桥/模式·文件切换同步/Toolbar 全套命令路由/bindPopup tooltip。**全部真机验证通过。**
- **图库插图（方案 A）**：PhotoViewPicker 选图 → 复制进沙箱 `filesDir/userimg/` → 相对路径 `userimg/x.png` → 两个 WebView 拦截器从 filesDir 读出。**真机验证通过。**

> 过程踩坑全部录入 Obsidian `鸿蒙开发/踩坑记录/`（WebView预览踩坑 十二~十七、bindPopup悬浮提示、文件IO 等）+ `官方组件示例-ComponentUXExamples.md`。

---

## 🎯 当前任务：Phase 6 — Toolbar 增强 + 更多 Markdown 命令

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
- [x] 6.2 缩进 / 减少缩进（tui 命令 `indent` / `outdent`）— **代码完成 ⏳ 待真机验证**。三处代码 + 2 新图标（Toolbar/Editor.mapToTui/MarkdownCommands + tui_indent/tui_outdent.svg）。spec: `.project/6.2-indent-outdent-spec.md`。
- [ ] 6.3 其它（查找替换 / 字数统计强化 / 更多对齐 等）— 范围待定。

### 暂缓（用户明确放后面）

- 图片 pickStatus 失败文案美化、DocumentViewPicker（任意文件源）、大图压缩。

---

## 关键约定（恢复必读）

- **Hermes 绝不写代码**：全部 `delegate` 给 CC（Docker 容器 `claude-code`）。Hermes 负责：写 spec → 审 diff → 修权限 → commit/push → 更新 .project。
- **调用 CC**：`/app/venv/bin/docker exec claude-code bash -c 'source /root/.cc_env && cd /data/docs/TuiEditorHarmonyOS && claude -p "..." --allowedTools "Read,Edit,Write"'`（实现类任务**不设 --max-turns**；后台跑用 `background=true, notify_on_complete=true`）。
- **审 diff 前修权限**：`/app/venv/bin/docker run --rm -v "/home/aintnece/Online Document/TuiEditorHarmonyOS:/ws" alpine chown -R 1000:1000 /ws`，再 `chmod 644` 改过的文件。
- **推送**：`git remote set-url origin git@github.com:aintnece/TuiEditorHarmonyOS.git && git config core.sshCommand 'ssh -i /tmp/gitpush_key -o StrictHostKeyChecking=no' && git push origin master:main`，完了 set-url 回 https + `git config --unset core.sshCommand`。
- **开工前**：grep/读 Obsidian `鸿蒙开发/踩坑记录/` 对应文档；新坑解决后补录（一坑一文件）。`官方组件示例` 离线仓库在 `/data/Online Document/_refs/HarmonyOSComponentUXExamples/`。
- CC 不编译（无 CLI）；编译/真机由用户在 DevEco(Windows) 做。每个改动 push 后请用户 `git pull` + 真机验证。

## Checkpoint

**Status**: Phase 5 + 图库插图全部完成并真机验证 ✓。Phase 6 待开工（范围建议先与用户确认）。
**Resume**: 新会话读本文件 + `status.md`。用户说"继续 Phase 6"即可从上面建议批次开始（先确认范围）。
