# 修复：图库选图后复制失败（静默） + 加可见反馈

> CC 执行。改 2 文件：FileService.ts、ImageEditor.ets。
> 现象：图库能拉起、能选图，但选完弹窗无反应、图片没插入。根因：`.then` 回调里复制环节抛错被空 `.catch` 静默吞掉。最可能 `fs.copyFileSync(srcUri, dest)` 不接受图库 media URI。

## 文件 1：FileService.ts — 重写 copyImageToSandbox（fd 复制 + 抛错不吞）

把现有 `copyImageToSandbox` 整个替换为（**改为出错时 throw，不再静默返回 null**；用 open(uri) 拿 fd 再 copyFileSync(fd,fd)）：

```ts
/** 复制选中的图片到沙箱图片目录，返回文件名（不含目录）。出错抛异常（由调用方捕获显示）。
 *  srcUri: 选择器返回的图片 URI；imageDir: 目标目录绝对路径（如 filesDir/userimg） */
copyImageToSandbox(srcUri: string, imageDir: string): string {
  if (srcUri.length === 0) {
    throw new Error('empty srcUri');
  }
  if (!this.ensureDir(imageDir)) {
    throw new Error('ensureDir failed: ' + imageDir);
  }
  const ext: string = imageExt(srcUri);
  const name: string = 'img_' + Date.now().toString() + ext;
  const dest: string = imageDir + '/' + name;
  // 打开图库 URI（选择器已授临时读权限），再用 fd 复制——比直接 copyFileSync(uri,path) 可靠
  const srcFile = fs.openSync(srcUri, fs.OpenMode.READ_ONLY);
  const destFile = fs.openSync(dest, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
  try {
    fs.copyFileSync(srcFile.fd, destFile.fd);
  } finally {
    fs.closeSync(srcFile);
    fs.closeSync(destFile);
  }
  return name;
}
```
（保留文件末尾的 `imageExt` 辅助函数不变。）

## 文件 2：ImageEditor.ets — 加状态显示 + 回调捕获错误

1. 加状态：
```ts
@State pickStatus: string = '';
```

2. pickFromGallery 改为（在 .then 回调里 try-catch 捕获复制错误，写进 pickStatus；copyImageToSandbox 现在返回 string 不再是 string|null）：
```ts
private pickFromGallery(): void {
  const self: ImageEditor = this;
  try {
    const photoPicker = new picker.PhotoViewPicker();
    const opt = new picker.PhotoSelectOptions();
    opt.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
    opt.maxSelectNumber = 1;
    photoPicker.select(opt).then((res: picker.PhotoSelectResult): void => {
      try {
        if (res && res.photoUris && res.photoUris.length > 0) {
          const uri: string = res.photoUris[0];
          const imageDir: string = getContext(self).filesDir + '/userimg';
          const name: string = fileService.copyImageToSandbox(uri, imageDir);
          self.imageUrl = 'userimg/' + name;
          self.pickStatus = '已选择: ' + name;
        } else {
          self.pickStatus = '未选择图片';
        }
      } catch (e) {
        self.pickStatus = '复制失败: ' + ((e as Error).message !== undefined ? (e as Error).message : 'unknown');
      }
    }).catch((e: Object): void => {
      self.pickStatus = '选择出错: ' + String(e);
    });
  } catch (e) {
    self.pickStatus = '启动选择器出错: ' + ((e as Error).message !== undefined ? (e as Error).message : 'unknown');
  }
}
```

3. 在「从图库选择」按钮**之后**，加一行状态文字（pickStatus 非空才显示）：
```ts
if (this.pickStatus !== '') {
  Text(this.pickStatus)
    .fontSize(11)
    .fontColor(this.themeColors.editorPlaceholder)
    .width('100%')
    .textAlign(TextAlign.Start)
    .margin({ bottom: 8 })
}
```

## 验证逻辑
- 修好后：选图 → pickStatus 显示「已选择: img_xxx.jpg」+ 图片地址框自动填 `userimg/img_xxx.jpg` → 点确定插入并显示。
- 若仍失败：pickStatus 显示**具体错误信息**（如 ENOENT / Permission denied / xxx），用户回报即可精确定位。

## 坑预案
- ArkTS：`catch (e)` 里用 `(e as Error).message` 取错误信息；copyImageToSandbox 现在返回 `string`（抛错而非返 null），ImageEditor 调用处用 try-catch 包。
- `fs.openSync(srcUri, READ_ONLY)` 对图库 URI 有效（选择器授临时读权限）；用 fd 复制。

## 不要做
- ❌ 不改 WwEditor.ets/MdPreview.ets/EditorPage.ets（拦截器已就绪）
- ❌ 不 commit/push，不动 .project
- 完成后列出改动文件。
