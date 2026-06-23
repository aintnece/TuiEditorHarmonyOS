# 图片插入：系统图库选择（方案 A — 沙箱复制 + 相对路径 + 双拦截器）

> CC 执行。改 4 个文件：FileService.ts、ImageEditor.ets、WwEditor.ets、MdPreview.ets。
> 目标：ImageEditor 加「从图库选择」按钮 → PhotoViewPicker 选图 → 复制进沙箱 `filesDir/userimg/` → imageUrl 填相对路径 `userimg/<name>` → 两个 WebView 拦截器从 filesDir 读出显示。确认管线（confirmImage 按模式分流 addImage / markdown 插入）已就绪，无需改 EditorPage。
> PhotoViewPicker 是系统选择器，**不需要声明媒体权限**。

---

## 文件 1：entry/src/main/ets/services/FileService.ts

加方法（用已有 `import fs from '@ohos.file.fs'`）：

```ts
/** 复制选中的图片到沙箱图片目录，返回文件名（不含目录）；失败返回 null。
 *  srcUri: 选择器返回的图片 URI；imageDir: 目标目录绝对路径（如 filesDir/userimg） */
copyImageToSandbox(srcUri: string, imageDir: string): string | null {
  if (srcUri.length === 0 || imageDir.length === 0) {
    return null;
  }
  if (!this.ensureDir(imageDir)) {
    return null;
  }
  try {
    const ext: string = imageExt(srcUri);
    const name: string = 'img_' + Date.now().toString() + ext;
    const dest: string = imageDir + '/' + name;
    fs.copyFileSync(srcUri, dest);
    return name;
  } catch (_e) {
    return null;
  }
}
```

文件末尾辅助函数区加：

```ts
/** 从 URI/路径提取图片扩展名（带点），无法识别则默认 .jpg */
function imageExt(uri: string): string {
  const dot: number = uri.lastIndexOf('.');
  if (dot >= 0) {
    const e: string = uri.substring(dot).toLowerCase();
    if (e === '.png' || e === '.jpg' || e === '.jpeg' || e === '.gif' || e === '.webp' || e === '.bmp') {
      return e;
    }
  }
  return '.jpg';
}
```
（若 `fs.copyFileSync(srcUri, dest)` 对 URI 不生效，改用 open 源+目标 fd 再 `fs.copyFileSync(srcFile.fd, destFile.fd)`，或读字节再写。先试路径/URI 形式。）

---

## 文件 2：entry/src/main/ets/components/ImageEditor.ets

顶部加 import：
```ts
import { picker } from '@kit.CoreFileKit';
import { fileService } from '../services/FileService';
```
（若 `@kit.CoreFileKit` 无 picker，用 `import { picker } from '@ohos.file.picker';`）

在「图片地址」TextInput **之后、替代文本之前**，加一个「从图库选择」按钮：

```ts
Button('从图库选择')
  .fontSize(13)
  .height(36)
  .width('100%')
  .backgroundColor(Color.Transparent)
  .fontColor('#0366d6')
  .border({ width: 1, color: this.themeColors.borderColor })
  .borderRadius(6)
  .margin({ bottom: 12 })
  .onClick(() => { this.pickFromGallery(); })
```

加私有方法（@Component 内可用 getContext(this)）：

```ts
private pickFromGallery(): void {
  const self: ImageEditor = this;
  try {
    const photoPicker = new picker.PhotoViewPicker();
    const opt = new picker.PhotoSelectOptions();
    opt.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
    opt.maxSelectNumber = 1;
    photoPicker.select(opt).then((res: picker.PhotoSelectResult): void => {
      if (res && res.photoUris && res.photoUris.length > 0) {
        const uri: string = res.photoUris[0];
        const imageDir: string = getContext(self).filesDir + '/userimg';
        const name: string | null = fileService.copyImageToSandbox(uri, imageDir);
        if (name !== null) {
          self.imageUrl = 'userimg/' + name;
        }
      }
    }).catch((_e: Object): void => {
      // 用户取消或失败，静默
    });
  } catch (_e) {
    // ignore
  }
}
```
（选完把 `this.imageUrl` 填成 `userimg/<name>`，用户点「确定」即按现有 confirmImage 流程插入；WYSIWYG→addImage{altText,imageUrl}、Markdown→`![alt](userimg/<name>)`。）

---

## 文件 3：entry/src/main/ets/editor/markdown/WwEditor.ets

顶部加 `import fs from '@ohos.file.fs';`

onInterceptRequest 里，**在算出 relPath（已剥 query/fragment）之后**，先判断 userimg：若 `relPath.startsWith('userimg/')` → 从沙箱读，否则走原 rawfile 逻辑。即：

```ts
const rawPath: string = 'tui-editor/' + relPath;

const resp: WebResourceResponse = new WebResourceResponse();
resp.setResponseEncoding('utf-8');
resp.setResponseMimeType(this.getMimeType(relPath));
resp.setResponseCode(200);
resp.setReasonMessage('OK');

// ★ 用户图片：从沙箱 filesDir/userimg 读
if (relPath.startsWith('userimg/')) {
  try {
    const filePath: string = getContext(this).filesDir + '/' + relPath;
    const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
    const stat = fs.statSync(filePath);
    const buf: ArrayBuffer = new ArrayBuffer(stat.size);
    fs.readSync(file.fd, buf);
    fs.closeSync(file);
    resp.setResponseData(buf);
    resp.setResponseHeader([{ headerKey: 'Access-Control-Allow-Origin', headerValue: WW_HOST }]);
    resp.setResponseIsReady(true);
    return resp;
  } catch (e) {
    return null;
  }
}

// 原 rawfile 逻辑（getRawFileContentSync ...）保持不变
try {
  const ctx: resourceManager.ResourceManager = getContext(this).resourceManager;
  ...原样...
}
```

getMimeType 加图片类型：
```ts
if (path.endsWith('.png')) return 'image/png';
if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
if (path.endsWith('.gif')) return 'image/gif';
if (path.endsWith('.webp')) return 'image/webp';
if (path.endsWith('.bmp')) return 'image/bmp';
```

---

## 文件 4：entry/src/main/ets/editor/markdown/MdPreview.ets

顶部加 `import fs from '@ohos.file.fs';`

onInterceptRequest 里，在现有 APP_URL / KATEX_PREFIX 分支**之外**加 userimg 分支：预览页相对图片 `userimg/x.png` 会解析成 `https://markdown.local/userimg/x.png`。

```ts
const USERIMG_PREFIX: string = 'https://markdown.local/userimg/';
// ... 在 onInterceptRequest 内，APP_URL 分支之后、KATEX 分支附近：
if (url.startsWith(USERIMG_PREFIX)) {
  const rel: string = 'userimg/' + url.substring(USERIMG_PREFIX.length);
  const resp = new WebResourceResponse();
  resp.setResponseEncoding('utf-8');
  resp.setResponseMimeType(this.getMimeType(rel));
  resp.setResponseCode(200);
  resp.setReasonMessage('OK');
  try {
    const filePath: string = getContext(this).filesDir + '/' + rel;
    const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
    const stat = fs.statSync(filePath);
    const buf: ArrayBuffer = new ArrayBuffer(stat.size);
    fs.readSync(file.fd, buf);
    fs.closeSync(file);
    resp.setResponseData(buf);
    resp.setResponseHeader([{ headerKey: 'Access-Control-Allow-Origin', headerValue: 'https://markdown.local' }]);
    resp.setResponseIsReady(true);
    return resp;
  } catch (e) {
    return null;
  }
}
```

getMimeType 同样加上面那 5 行图片类型（MdPreview 的 getMimeType 现在只有 css/js/woff*，补图片）。

---

## 坑预案 / 注意
- 相对路径 `userimg/x.png` 在两个 WebView 各自页面（wweditor.local / markdown.local）下分别解析到各自域名，两个拦截器都映射到**同一个** `filesDir/userimg/`，所以两处都能显示。
- PhotoViewPicker 系统选择器**无需声明权限**；它返回的 URI 有临时读授权，copyFileSync 当场复制进沙箱（之后不依赖该 URI）。
- ArkTS：picker 选项用 `new picker.PhotoSelectOptions()`（禁对象字面量）；回调里先 `const self = this`；fs 读字节用 ArrayBuffer + readSync(fd, buf)；setResponseData 接 ArrayBuffer。
- 图片 MIME 必须对（image/png 等），否则 WebView 不显示。
- `.md` 里存的是相对 `userimg/x.png`：在本机能显示（沙箱有图）；拷到别处需带 userimg 文件夹——这是方案 A 的已知取舍。

## 不要做
- ❌ 不改 EditorPage.ets（confirmImage 已分流，填好 imageUrl 即可）/ Toolbar.ets / editor.html
- ❌ 不声明媒体权限（PhotoViewPicker 不需要）
- ❌ 不 commit/push，不动 .project
- 完成后列出改动文件。
