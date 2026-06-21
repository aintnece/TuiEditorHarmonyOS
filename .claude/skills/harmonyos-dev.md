# 鸿蒙 ArkTS 开发指南

当编写或修改 `.ets` / `.ts` 文件时，自动应用以下规则。

## 文档查询

遇到不确定的 API 或组件时，先查 Obsidian 文档库：

```bash
# 搜索鸿蒙开发相关文档
grep -r "关键词" /data/docs/obsidian-vault/鸿蒙开发/ --include="*.md" -l

# 查看具体文档
cat /data/docs/obsidian-vault/鸿蒙开发/相关文件.md
```

Obsidian vault 中的鸿蒙目录包含：
- API 参考
- 组件用法
- 踩坑记录
- 编译错误修复方案

## ArkTS 严格模式速查

### 绝对禁止
- `any` / `unknown` 类型 → 用具体类型或联合类型
- `Record<K,V>` → 用 class 替代
- `{...obj}` 展开 → 逐个字段显式赋值
- `obj[key]` 索引访问 → 用 `obj.key`
- 回调中直接 `this` → 先用 `const self = this`
- 对象字面量直接传参 → 先声明类型化变量
- import 不在文件顶部 → 移到最前面

### 必须做的
```typescript
// 路由传参：先定义 class
class NavData { filePath: string = ''; }
const data = new NavData();
data.filePath = '/path';
router.pushUrl({ url: 'pages/Target', params: data });

// 回调中 this
const self = this;
list.map((item) => self.process(item));  // ✅
// list.map((item) => this.process(item)) // ❌

// Button 链式写法
Button().onClick(() => this.handle())   // ✅
// Button({ onClick: () => ... })       // ❌

// 字符串拼接替代正则（正则 \\ 转义不可靠）
const result = html.split('</head>').join(css + '\n</head>');
```

### 常见编译错误速查
| 错误 | 原因 | 修复 |
|------|------|------|
| `arkts-no-untyped-obj-literals` | 对象字面量无类型 | 声明类型化变量再赋值 |
| `arkts-no-standalone-this` | 回调中用 this | `const self = this` |
| `arkts-no-spread` | 用了 `{...obj}` | 逐个显式赋值 |
| `arkts-no-any-unknown` | 用了 any/unknown | 改为具体类型 |
| `arkts-no-props-by-index` | 用了 `obj[key]` | 改为 `obj.key` |

## 组件模式

```typescript
@Component
export struct MyComponent {
  // 父→子：@Prop
  @Prop data: string = '';
  
  // 子→父双向：@Link（父传 `$stateVar`）
  @Link value: number;
  
  // 内部状态：@State
  @State private active: boolean = false;
  
  // 初始化用 aboutToAppear()，不用 constructor
  aboutToAppear(): void {
    const self = this;
    // 事件监听
    this.editorCore.on('change', (): void => {
      self.active = true;
    });
  }
  
  build() {
    Column() {
      Text(this.data)
    }
  }
}
```

## API 版本兼容

项目目标 API 11 (compatibleSdkVersion: "4.1.0(11)")，但可用 API 12 特性。

| API 11 (旧) | API 12 (新) |
|-------------|-------------|
| `getContext()` | `getContext(this)` |
| `writeTextSync(fd, content)` | `writeSync(fd, content)` |
| `ScrollBarState` | `BarState` |
| `WebviewController()` | `new webview.WebviewController()` |

## 资源文件格式

所有 element JSON 必须用数组格式：
```json
{ "string": [{ "name": "key", "value": "文本" }] }
{ "color": [{ "name": "bg", "value": "#FFFFFF" }] }
```

## WebView 注意事项
- 用 `loadUrl(data:...)` 而非 `loadData()`
- 大 HTML 内容用 `onInterceptRequest` 返回 `WebResourceResponse`
- 鸿蒙 WebView URL 限制约 8KB
- 本地资源用 `rawfile` 路径
- KaTeX 等第三方库通过 `onInterceptRequest` 拦截 CDN 请求返回本地文件

## 坑点提醒
1. **bindPopup 在小按钮上不可靠** — 避免在 <40px 按钮上用 bindPopup，改用 Stack + position()
2. **PanGesture.offsetX 是累积值** — 用 delta 模式（存 last，每次算差值）
3. **文件编辑后 owner 变成 root** — Hermes 会用 `docker run alpine chown` 修复
4. **`@Link $varName` 不是 `$this.varName`** — 注意写法
