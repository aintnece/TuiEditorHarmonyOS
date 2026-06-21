# .project/ 开发进度追踪

当被要求执行开发任务时，**必须先读 `.project/active-task.md`** 了解当前进度，
完成后必须更新 `.project/active-task.md` 的 Progress 和 Checkpoint。

## 工作流

### 任务开始前
```bash
# 1. 读项目上下文
cat CLAUDE.md

# 2. 读当前任务
cat .project/active-task.md

# 3. 读项目状态
cat .project/status.md
```

### 任务执行中
- 按 `active-task.md` 中的 Progress 逐步推进
- 遇到鸿蒙 API 不确定 → 查 Obsidian 文档（见 harmonyos-dev skill）
- 遇到 ArkTS 编译错误 → 查 CLAUDE.md 中「已知陷阱」

### 任务完成后
**立即更新 `.project/active-task.md`**，不要等 Hermes 提醒：

```markdown
## Progress
- [x] Step 1: 已完成 XXX
- [x] Step 2: 已完成 YYY
- [ ] Step 3: 待 Hermes 验证编译

## Checkpoint
**Status**: `in_progress` | `awaiting_user` | `completed`
**Changed files**: 
- `path/to/file.ets` — 修改说明
- `path/to/file2.ts` — 修改说明
**Verification required**: 需要 Hermes 在 DevEco Studio 编译验证
```

### 遇到阻塞时
如果遇到无法解决的问题（编译错误 3 次尝试失败、API 文档中找不到、架构需要 Hermes 决策）：
1. 记录到 `active-task.md` 的 Checkpoint
2. 写清楚「试过什么」「结果如何」「需要什么帮助」
3. 在报告中明确说「BLOCKED: 原因」

## .project/ 文件职责

| 文件 | 谁写 | 内容 |
|------|------|------|
| `status.md` | Hermes | 总览：已完成/进行中/下一步 |
| `active-task.md` | CC 更新 Progress, Hermes 更新 Objective | 当前任务详情 |
| `context.md` | Hermes | 技术栈、架构、约定 |
| `episodes/` | Hermes | 会话总结 |
| `decisions/` | Hermes | 架构决策记录 |

**CC 只写 `active-task.md` 的 Progress、Changed files、Checkpoint**。
不要改 status.md、context.md、episodes/、decisions/（那些是 Hermes 的）。

## 报告格式

任务结束后，在最终回复中用以下格式报告：

```
## 任务完成报告

**任务**: [从 active-task.md 的 Objective]
**状态**: 完成 / 部分完成 / 阻塞
**修改文件**:
- `path/file.ets` — 做了什么
- `path/file2.ts` — 做了什么
**未解决问题**: 如有
**需要 Hermes 做的事**: 编译验证 / 审查 diff / 决策
```
