/**
 * ImageEditor — 图片插入弹窗
 *
 * 对标 tui.editor 的 image popup。提供图片 URL 和替代文本两个输入框，
 * 确认后通过回调返回数据。使用 @CustomDialog 实现。
 *
 * 参考：tui.editor src/ui/popup/imagePopup.ts
 */

import { ThemeColors } from '../services/ThemeService';

@Component
export struct ImageEditor {
  @State imageUrl: string = '';
  @State altText: string = '';
  themeColors: ThemeColors = new ThemeColors();
  onConfirm?: (alt: string, url: string) => void;
  onCancel?: () => void;

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
