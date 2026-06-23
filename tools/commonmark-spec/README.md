# CommonMark Spec 测试管线

对 TOAST UI Editor 鸿蒙原生移植的解析器运行 CommonMark 0.31.2 官方规范用例（652 条），产出基线通过率与失败编目。

## 怎么跑

```bash
cd tools/commonmark-spec
./node_modules/.bin/tsx run-spec.ts
```

## 产物

| 文件 | 说明 |
|------|------|
| `failures.txt` | 所有非精确匹配用例，按 ERROR → STRUCT → COSMETIC 分组 |
| `baseline.json` | 快照基线（各节 exact/cosmetic/struct/error 计数），供后续迭代对比 |

## 四类结果

| 类别 | 含义 |
|------|------|
| **EXACT** | 逐字节精确匹配 CommonMark 官方期望 HTML |
| **COSMETIC** | 仅行尾空白等表面差异，归一化后一致 |
| **STRUCT** | 归一化后仍不一致，代表语义/结构差异 |
| **ERROR** | 解析或渲染抛异常 |

## 环境

- `spec.json` — CommonMark 0.31.2 官方用例，652 条
- `node_modules/` — Hermes 离线 vendoring（tsx@4 + esbuild），容器无外网/无 npm
- **不要 `npm install`** — 会因无外网而失败
