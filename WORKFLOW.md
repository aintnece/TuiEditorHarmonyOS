# Hermes ↔ Claude Code 协作协议

## 角色分工

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│      Hermes Agent           │     │      Claude Code             │
│      (监工 / 架构师)         │     │      (编码 / 执行)            │
├─────────────────────────────┤     ├──────────────────────────────┤
│ ✅ 架构设计与审查             │     │ ✅ 读 CLAUDE.md + skills      │
│ ✅ 任务分解与分配             │     │ ✅ 读 .project/active-task.md │
│ ✅ .project/ 状态管理         │     │ ✅ 查 Obsidian 鸿蒙文档       │
│ ✅ git commit/push           │     │ ✅ 写代码 / 修改文件          │
│ ✅ diff 审查                 │     │ ✅ 自我审查 (git diff)        │
│ ✅ 测试/编译（IDE端）         │     │ ✅ 更新 active-task Progress  │
│ ❌ 不直接写代码               │     │ ❌ 不 commit / push           │
│                              │     │ ❌ 不改 .project/ 架构文件    │
└─────────────────────────────┘     └──────────────────────────────┘
```

## 一次任务的标准流程

### 1. Hermes 分配任务
```
Hermes → 写 .project/active-task.md:
  - Objective: 做什么
  - Context: 背景/参考文件
  - Progress: 待办步骤（checkbox）
  - Checkpoint: status=in_progress

Hermes → docker exec claude-code claude -p "任务描述" --max-turns N
```

### 2. Claude Code 执行
```
CC → 读 CLAUDE.md (项目上下文)
CC → 读 .project/active-task.md (当前任务)
CC → 查 Obsidian vault (遇到 API 不确定时)
CC → 写代码
CC → 自我审查: git diff
CC → 更新 active-task.md Progress + Changed files
CC → 返回「任务完成报告」
```

### 3. Hermes 审查
```
Hermes → 读 CC 的报告
Hermes → git diff 审查改动
Hermes → 如果通过: git add -A && git commit && git push
Hermes → 更新 .project/status.md
Hermes → 写 episode 记录
Hermes → 分配下一个任务
```

### 4. 异常流程
```
编译失败 → Hermes 反馈错误信息 → CC 修复 → 重复 2-3
阻塞 → CC 标记 BLOCKED → Hermes 决策 → 更新 active-task.md
```

## 文件所有权

| 路径 | 谁写 | 用途 |
|------|------|------|
| `CLAUDE.md` | Hermes | 项目约定、ArkTS规则、架构 |
| `.claude/skills/*.md` | Hermes | CC 的领域知识 |
| `.claude/settings.json` | Hermes | CC 权限配置 |
| `.project/status.md` | Hermes | 项目总览 |
| `.project/context.md` | Hermes | 技术上下文 |
| `.project/active-task.md` | CC (Progress) + Hermes (Objective) | 当前任务 |
| `.project/episodes/*.md` | Hermes | 会话记录 |
| `entry/src/main/ets/**` | CC | 源代码 |
| `resources/**` | Hermes | 资源文件 |

## CC 容器信息

- 容器: `claude-code` (image: `claude-code-snapshot`)
- 模型: `deepseek-v4-pro` (via `ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`)
- 工作目录: `/data/docs/TuiEditorHarmonyOS/`
- Obsidian vault: `/data/docs/obsidian-vault/` (只读)
- 网络: `hermes-net`

## 调用方式

```bash
# 单次任务（首选）
docker exec -w /data/docs/TuiEditorHarmonyOS claude-code \
  claude -p "实现 Phase 4.6: ContextMenu 右键菜单" \
  --model deepseek-v4-pro \
  --allowedTools "Read,Edit,Write,Bash" \
  --max-turns 8 \
  --output-format json
```

## 代码审查通过标准

- [ ] ArkTS 严格模式规则全部遵守
- [ ] 无 `any` / `unknown` / `Record` / spread
- [ ] `const self = this` 模式正确使用
- [ ] 组件 Props/State 声明正确
- [ ] 无硬编码中文（应用 i18n）
- [ ] 与 CLAUDE.md 中的架构一致
- [ ] 无遗留 debug 代码或 console.log
