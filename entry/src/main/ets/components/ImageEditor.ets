/**
 * ImageEditor — 图片插入弹窗
 *
 * 对标 tui.editor 的 image popup。提供图片 URL 和替代文本两个输入框，
 * 确认后通过回调返回数据。使用 @CustomDialog 实现。
 *
 * 参考：tui.editor src/ui/popup/imagePopup.ts
 */

import { picker } from '@kit.CoreFileKit';
import { ThemeColors } from '../services/ThemeService';
import { fileService } from '../services/FileService';

@Component
export struct ImageEditor {
  @State imageUrl: string = '';
  @State altText: string = '';
  @State pickStatus: string = '';
  themeColors: ThemeColors = new ThemeColors();
  onConfirm?: (alt: string, url: string) => void;
  onCancel?: () => void;

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
            const imageDir: string = self.getUIContext().getHostContext()!.filesDir + '/userimg';
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

  build() {
    Column() {
      // ── 标题 ──
      Text('插入图片')
        .fontSize(18)
        .fontWeight(600)
        .fontColor(this.themeColors.editorFg)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 16 })

      // ── 图片地址 ──
      Text('图片地址')
        .fontSize(12)
        .fontColor(this.themeColors.editorPlaceholder)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 4 })

      TextInput({ text: this.imageUrl, placeholder: 'https://...' })
        .width('100%')
        .height(40)
        .fontSize(14)
        .fontColor(this.themeColors.editorFg)
        .backgroundColor(this.themeColors.editorBg)
        .border({ width: 1, color: this.themeColors.borderColor })
        .borderRadius(6)
        .padding({ left: 10, right: 10 })
        .margin({ bottom: 12 })
        .onChange((value: string) => {
          this.imageUrl = value;
        })

      // ── 从图库选择 ──
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

      if (this.pickStatus !== '') {
        Text(this.pickStatus)
          .fontSize(11)
          .fontColor(this.themeColors.editorPlaceholder)
          .width('100%')
          .textAlign(TextAlign.Start)
          .margin({ bottom: 8 })
      }

      // ── 替代文本 ──
      Text('替代文本 (alt)')
        .fontSize(12)
        .fontColor(this.themeColors.editorPlaceholder)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 4 })

      TextInput({ text: this.altText, placeholder: '图片描述...' })
        .width('100%')
        .height(40)
        .fontSize(14)
        .fontColor(this.themeColors.editorFg)
        .backgroundColor(this.themeColors.editorBg)
        .border({ width: 1, color: this.themeColors.borderColor })
        .borderRadius(6)
        .padding({ left: 10, right: 10 })
        .margin({ bottom: 20 })
        .onChange((value: string) => {
          this.altText = value;
        })

      // ── 按钮栏 ──
      Row() {
        Button('取消')
          .fontSize(14)
          .height(36)
          .padding({ left: 16, right: 16 })
          .backgroundColor(Color.Transparent)
          .fontColor(this.themeColors.editorPlaceholder)
          .border({ width: 1, color: this.themeColors.borderColor })
          .borderRadius(6)
          .margin({ right: 10 })
          .onClick(() => {
            if (this.onCancel) { this.onCancel(); }
          })

        Button('确定')
          .fontSize(14)
          .height(36)
          .padding({ left: 16, right: 16 })
          .backgroundColor('#0366d6')
          .fontColor('#ffffff')
          .borderRadius(6)
          .onClick(() => {
            if (this.onConfirm) {
              const alt: string = this.altText !== '' ? this.altText : '图片';
              const url: string = this.imageUrl !== '' ? this.imageUrl : 'https://';
              this.onConfirm(alt, url);
            }
          })
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
    }
    .width('100%')
    .padding(20)
  }
}
