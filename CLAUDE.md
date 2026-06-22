# TuiEditorHarmonyOS — Toast UI Editor 鸿蒙原生移植

**项目目标**: 1:1 复刻 TOAST UI Editor v3.2.2 到 HarmonyOS NEXT (ArkTS)
**当前阶段**: Phase 4.8 完成 ✓ — 文件系统 I/O 集成完毕，进入 Phase 5 (WYSIWYG)
**技术栈**: ArkTS (strict mode) + ArkUI + API 12
**IDE**: DevEco Studio 5.0+ (Windows)

## 项目结构

```
entry/src/main/ets/
├── editor/          # 编辑器核心
│   ├── Editor.ts           # 工厂入口 Editor.factory()
│   ├── EditorCore.ts       # 主协调器（持有所有子系统）
│   ├── EditorType.ts       # 类型/配置/状态定义
│   ├── selection/          # 选区模型
│   ├── commands/           # 命令系统 (undo/redo)
│   └── markdown/           # MdEditor + MdPreview 组件
├── parser/          # Markdown 解析器
│   ├── ToastMark.ts        # 薄层入口
│   ├── commonmark/         # CommonMark + GFM
│   └── html/               # AST → HTML 渲染
├── components/      # UI 组件
│   ├── Toolbar.ets         # 22按钮工具栏
│   ├── Splitter.ets        # 拖拽分栏
│   ├── LinkEditor.ets      # 链接弹窗
│   ├── ImageEditor.ets     # 图片弹窗
│   └── PopupMenu.ets       # 表格操作菜单
├── event/           # EventEmitter 事件总线
├── spec/            # Schema 节点/标记定义
├── services/        # ThemeService (28 color tokens)
├── i18n/            # I18n (~110 keys)
└── pages/           # EditorPage + Index
```

## 架构

三层架构对标原版 tui.editor：
```
Parser (ToastMark) → EditorCore (命令/选区/事件) → UI (Toolbar/MdEditor/MdPreview)
```

- **EditorCore** 是中心协调器，持有 7 个子系统
- **EventEmitter** 解耦通信 (change / caretChange / stateChange)
- **CommandManager** 采用全快照 undo/redo (EditorState.snapshot())
- **Editor.factory()** 静态工厂对标原版 API

## 关键命令

```bash
# 编译由 DevEco Studio 执行（无 CLI）
# CC 只负责改代码，不编译
```

## 开发工作流：Hermes 监工 + Claude Code 编码

```
Hermes (你老板)              Claude Code (你)
─────────────                ─────────────
• 审查架构设计               • 读取 CLAUDE.md + skills
• 写 .project/ 任务           • 读 .project/active-task.md 了解当前任务
• 审查 diff 后提交            • 读 Obsidian 鸿蒙开发文档
• 管理 git commit/push        • 写代码 + 自测
• 更新 .project/status.md     • 完成后报告变更文件清单
```

**规则**:
- CC 每次任务结束后报告「改了哪些文件」，由 Hermes 审查
- CC 遇到不确定的鸿蒙 API 时，先查 Obsidian vault: `/data/docs/obsidian-vault/鸿蒙开发/`
- CC 不要自己 commit/push，留给 Hermes
- CC 完成后更新 `.project/active-task.md` 的 Progress 和 Checkpoint

## ArkTS 严格模式规则（必读！）

### 禁止事项
| 规则 | 错误提示 |
|------|---------|
| ❌ 对象字面量直接赋值给类型 | `arkts-no-untyped-obj-literals` |
| ❌ 展开运算符 `{...obj}` | `arkts-no-spread` — 必须逐个显式赋值 |
| ❌ `any` / `unknown` 类型 | `arkts-no-any-unknown` — 用具体类型 |
| ❌ `Record<K,V>` | `arkts-no-indexed-signatures` — 用 class |
| ❌ `obj[key]` 索引访问 | `arkts-no-props-by-index` — 用 `obj.key` |
| ❌ 回调中直接用 `this` | `arkts-no-standalone-this` — 先用 `const self = this` |
| ❌ import 不在文件顶部 | `arkts-no-misplaced-imports` |
| ❌ 正则表达式 `\\` 转义 | 不可靠，用 split/join 替代 |

### 正确做法

```typescript
// ✅ 路由传参：定义 class + 逐个赋值（禁止对象字面量）
class NavData { filePath: string = ''; }
const data = new NavData();
data.filePath = '/path';
router.pushUrl({ url: 'pages/Editor', params: data });

// ✅ 回调中捕获 this
const self = this;
this.editorCore.on('change', (): void => {
  self.editorText = self.editorCore.getMarkdown();
});

// ✅ Button 用链式 onClick，不用构造函数传参
Button().onClick(() => this.handleClick())       // ✅
// Button({ onClick: () => ... })                // ❌ arkts-no-untyped-obj-literals

// ✅ 资源文件用数组格式（非键值对）
// string.json: { "string": [{ "name": "key", "value": "文本" }] }
```

### API 11→12 变更
| 旧 API | 新 API |
|--------|--------|
| `writeTextSync(fd, content)` | `writeSync(fd, content)` |
| `getContext()` | `getContext(this)` |
| `ScrollBarState` | `BarState` |
| `WebviewController()` | `new webview.WebviewController()` |
| `configChanges` (ability) | 直接删除 |
| `version` 对象 (AppScope) | 平铺 `versionCode`/`versionName` |

### 已知陷阱
- **bindPopup 不可靠** — 32px 按钮上需要双击才能触发 onClick。改用 Stack + position() 内联 tooltip
- **PanGesture.offsetX 累积值** — 用 delta 模式（存 lastPanX，每次计算差值）
- **WebView 只能用 loadUrl(data: URI)** — 不能用 loadData()
- **鸿蒙 WebView 8KB URL 限制** — 大 HTML 分段加载
- **ohpm install 在 NAS Z: 盘失败** — 须在 NTFS 本地盘开发
- **`@Link $splitRatio`** 非 `$this.splitRatio`

## Obsidian 鸿蒙开发文档

位置: `/data/docs/obsidian-vault/鸿蒙开发/`

查询策略：
```
# 遇到 API 不确定时：
1. grep -r "关键词" /data/docs/obsidian-vault/鸿蒙开发/
2. 读匹配文档
3. 参考 harmonyos-project-setup skill（已内化在本文中）
```

## 当前进度

详见 `.project/status.md` 和 `.project/active-task.md`。

**Phase 4.5 完成** — 31 文件就绪，编辑器具备完整 Markdown 能力。
**下一步**: Phase 4.6 ContextMenu 右键菜单。

## 组件设计模式

- `@Component` 用于 UI 组件 (.ets)
- 纯逻辑用 `.ts` 文件
- `@State` 管理组件内状态，`@Prop` 父→子，`@Link` 子→父双向
- `aboutToAppear()` 初始化（非 constructor）
- `@Builder` 用于复用 UI 片段（但不能用于 bindPopup）
- 需要 `@Observed` 的 class 才能搭配 `@ObjectLink`
