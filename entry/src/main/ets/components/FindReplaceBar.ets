/**
 * FindReplaceBar — 查找替换条 UI 组件
 *
 * 位于工具栏之下、内容区之上（默认隐藏）。输入即时匹配、上/下循环跳转、
 * 替换 / 全部替换 / 关闭。仅高亮当前匹配。
 */

import { ThemeColors } from '../services/ThemeService';

@Component
export struct FindReplaceBar {
  @Prop themeColors: ThemeColors = new ThemeColors();
  /** 受控查询值 */
  @Prop query: string = '';
  @Prop replacement: string = '';
  @Prop matchCount: number = 0;      // 总匹配数
  @Prop matchIndex: number = 0;      // 当前序号（1-based；0 表示无）

  onQueryChange?: (q: string) => void;
  onReplacementChange?: (r: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onReplace?: () => void;
  onReplaceAll?: () => void;
  onClose?: () => void;

  @State hoveredTip: string = '';

  @Builder
  iconBtn(media: Resource, tip: string, action: () => void) {
    Button({ type: ButtonType.Normal }) {
      Image(media).width(16).height(16)
    }
    .width(28).height(28).padding(0)
    .backgroundColor(this.hoveredTip === tip ? this.themeColors.toolbarHover : Color.Transparent)
    .borderRadius(4)
    .onClick(action)
    .onHover((isHover: boolean): void => {
      if (isHover) {
        this.hoveredTip = tip;
      } else if (this.hoveredTip === tip) {
        this.hoveredTip = '';
      }
    })
    .bindPopup(this.hoveredTip === tip, {
      message: tip,
      placement: Placement.Bottom,
      mask: false
    })
    .margin({ left: 2, right: 2 })
  }

  build() {
    Row() {
      // 🔍 查找输入
      TextInput({ placeholder: '查找' })
        .width(160)
        .height(28)
        .fontSize(13)
        .fontColor(this.themeColors.editorFg)
        .backgroundColor(this.themeColors.editorBg)
        .border({ width: 1, color: this.themeColors.borderColor })
        .borderRadius(4)
        .padding({ left: 8, right: 8 })
        .onChange((v: string) => {
          if (this.onQueryChange) this.onQueryChange(v);
        })

      // 计数
      Text(this.matchCount === 0 ? '0/0' : (this.matchIndex + '/' + this.matchCount))
        .fontSize(12)
        .fontColor(this.themeColors.toolbarFg)
        .margin({ left: 8, right: 8 })

      // ↑ 上一个
      this.iconBtn($r('app.media.tui_chevron_up'), '上一个', () => { if (this.onPrev) this.onPrev(); })
      // ↓ 下一个
      this.iconBtn($r('app.media.tui_chevron_down'), '下一个', () => { if (this.onNext) this.onNext(); })

      // 替换输入
      TextInput({ placeholder: '替换为' })
        .width(160)
        .height(28)
        .fontSize(13)
        .fontColor(this.themeColors.editorFg)
        .backgroundColor(this.themeColors.editorBg)
        .border({ width: 1, color: this.themeColors.borderColor })
        .borderRadius(4)
        .padding({ left: 8, right: 8 })
        .margin({ left: 8 })
        .onChange((v: string) => {
          if (this.onReplacementChange) this.onReplacementChange(v);
        })

      // [替换]
      Button({ type: ButtonType.Normal }) {
        Text('替换')
          .fontSize(11)
          .fontColor(this.themeColors.toolbarFg)
          .fontWeight(400)
      }
        .height(28).padding({ left: 8, right: 8 })
        .backgroundColor(Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (this.onReplace) this.onReplace(); })
        .margin({ left: 4, right: 2 })

      // [全部替换]
      Button({ type: ButtonType.Normal }) {
        Text('全部替换')
          .fontSize(11)
          .fontColor(this.themeColors.toolbarFg)
          .fontWeight(400)
      }
        .height(28).padding({ left: 8, right: 8 })
        .backgroundColor(Color.Transparent)
        .borderRadius(4)
        .onClick(() => { if (this.onReplaceAll) this.onReplaceAll(); })
        .margin({ left: 2, right: 2 })

      // ✕ 关闭
      this.iconBtn($r('app.media.tui_close'), '关闭', () => { if (this.onClose) this.onClose(); })
    }
    .width('100%')
    .height(40)
    .padding({ left: 8, right: 8 })
    .backgroundColor(this.themeColors.toolbarBg)
    .border({ width: { bottom: 1 }, color: this.themeColors.borderColor })
    .clip(false)
  }
}
