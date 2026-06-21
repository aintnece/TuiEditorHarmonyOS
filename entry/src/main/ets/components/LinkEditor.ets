/**
 * LinkEditor — 链接编辑弹窗
 *
 * 对标 tui.editor 的 link popup。提供 URL 和链接文本两个输入框，
 * 确认后通过回调返回数据。使用 @CustomDialog 实现。
 *
 * 参考：tui.editor src/ui/popup/linkPopup.ts
 */

import { ThemeColors } from '../services/ThemeService';

@Component
export struct LinkEditor {
  @State linkText: string = '';
  @State linkUrl: string = '';
  themeColors: ThemeColors = new ThemeColors();
  onConfirm?: (text: string, url: string) => void;
  onCancel?: () => void;

  build() {
    Column() {
      // ── 标题 ──
      Text('插入链接')
        .fontSize(18)
        .fontWeight(600)
        .fontColor(this.themeColors.editorFg)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 16 })

      // ── 链接文本 ──
      Text('链接文本')
        .fontSize(12)
        .fontColor(this.themeColors.editorPlaceholder)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 4 })

      TextInput({ text: this.linkText, placeholder: '链接显示的文字' })
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
          this.linkText = value;
        })

      // ── URL ──
      Text('链接地址')
        .fontSize(12)
        .fontColor(this.themeColors.editorPlaceholder)
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 4 })

      TextInput({ text: this.linkUrl, placeholder: 'https://...' })
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
          this.linkUrl = value;
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
              const text: string = this.linkText !== '' ? this.linkText : '链接文本';
              const url: string = this.linkUrl !== '' ? this.linkUrl : 'https://';
              this.onConfirm(text, url);
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
