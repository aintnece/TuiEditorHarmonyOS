# Git 工作流

CC 负责写代码，**不负责 commit/push**。代码变更后由 Hermes 审查并执行 git 操作。

## CC 的 git 职责

### 可以做
- `git diff` — 查看自己的改动
- `git status` — 查看文件状态
- `git log --oneline -5` — 查看最近提交

### 不可以做
- ❌ `git add` 
- ❌ `git commit`
- ❌ `git push`
- ❌ `git checkout` 切换分支
- ❌ 任何修改 git 历史的操作

## 每次任务结束后的流程

1. 完成编码
2. 运行 `git diff --stat` 确认改了哪些文件
3. 运行 `git diff` 做最后的自我审查
4. 更新 `.project/active-task.md` 的 Progress 和 Changed files
5. 在最终报告中列出修改文件清单

## Hermes 收到报告后会做的事

1. 审查 git diff
2. 如果通过：`git add -A && git commit -m "type: 描述" && git push`
3. 更新 `.project/status.md`
4. 分配下一个任务

## 如果任务途中发现 bug

如果发现之前引入的 bug，优先自己修复。如果修复不了：
1. 记录到 `active-task.md`
2. 在报告中标记 **BLOCKED**
3. 说明需要 Hermes 介入的原因
