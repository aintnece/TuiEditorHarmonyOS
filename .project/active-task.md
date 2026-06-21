# Active Task

## Objective

修复 Toolbar 无响应 + 预览不更新 + Stack tooltip 闪烁/黑框

## Context

之前 Bug 修复和 Phase 4.6 引入了 3 个问题：
1. **Toolbar 按钮全部无效**：点击 Bold/Heading/撤销等无任何反应
2. **编辑区改文字，预览不变化**：MdEditor 输入内容后 MdPreview 不刷新
3. **Tooltip 从稳定气泡变成粗糙黑框**，部分按钮快速闪烁

## 改动历史（可能引入问题的 commit）
- `fb43968` — bindPopup→Stack tooltip 重构 Toolbar，加了 listener cleanup
- `bf1e660` — @Prop 类型从 Editor 改为 Editor|null，加了 null 守卫
- `7024820` — 上一轮编译修复：self.editorCore→局部 const
- `1ce4314` — 移除 .clip(false)（导致 tooltip 被裁切成黑框）

## 疑点分析

### 问题 1：Toolbar 按钮无效
Toolbar.ets 声明了 `@Prop editor: Editor | null = null`，EditorPage 在 `aboutToAppear()` 中创建 `this.editor = Editor.factory(opts)`，然后在 `build()` 中传 `editor: this.editor`。但 ArkTS 的 `@Prop` 对 class 实例可能不按预期工作——`@Prop` 是一向同步，可能在组件创建时拿到的是初始值 `null`（因为 `private editor: Editor | null = null`）。

**要排查**：Toolbar 的 `aboutToAppear()` 中打印 `this.editor` 是否为 null。

### 问题 2：预览不更新
MdEditor/MdPreview 的 `@Prop editorCore: EditorCore | null = null` 与 EditorPage 的 `private core: EditorCore | null = null` 类型匹配，但同样可能有 @Prop 传递问题。

### 问题 3：Tooltip 闪烁
`.clip(false)` 移除后，Stack 32×32 的容器裁切了 tooltip Text，只剩裁切后的碎片（黑框）。之前 `.clip(false)` 能解决但有 API 12 警告。闪烁是因为 hover 导致 tooltip 出现→布局重排→hover 状态变化→tooltip 消失→ 循环。

需要改为可靠方案：Stack 不要 clip tooltip → 改 `buildTooltip` 用条件渲染但放在 Stack 外部，或加大 Stack 尺寸到能容纳 tooltip，或回到 `bindPopup`。

## Progress

- [x] Step 1: CC 分析根因（读文件、理解 @Prop 传递机制）
- [x] Step 2: 修复 Toolbar 按钮无效 — 根因：EditorPage 的 `editor`/`core` 缺少 `@State` 装饰器，导致 ArkTS `@Prop` 无法正确传递 class 实例到子组件。修复：添加 `@State private editor` 和 `@State private core`
- [x] Step 3: 修复预览不更新 — 同根因修复，MdEditor/MdPreview 的 `@Prop editorCore` 现在能正确接收实例
- [x] Step 4: 修复 Tooltip 闪烁/黑框 — (a) 所有 Stack 恢复 `.clip(false)` 解决裁切黑框；(b) 新增 `setHovered()` 方法加 120ms 防抖消除闪烁；(c) 新增 `aboutToDisappear()` 清理 timer
- [ ] Step 5: Hermes 编译验证

## Checkpoint

**Status**: `in_progress`
**Assigned to**: Claude Code
**Next step**: CC 执行诊断和修复 → Hermes 审查 → commit
