/**
 * Splitter — 可拖拽分栏手柄
 *
 * 对标 MarkdownEditor 的 PanGesture 分栏逻辑。
 * 使用 delta 模式避免 offsetX 累积问题。
 * 参考：F:\MarkdownEditor\entry\src\main\ets\pages\EditorPage.ets:330-349
 */

import { ThemeColors } from '../services/ThemeService';

@Component
export struct Splitter {
  @Link splitRatio: number;
  @Prop containerWidth: number = 800;
  @Prop minRatio: number = 0.2;
  @Prop maxRatio: number = 0.8;
  @Prop themeColors: ThemeColors;

  @State private lastPanX: number = 0;
  @State private isHover: boolean = false;

  build() {
    Column()
      .width(6)
      .height('100%')
      .backgroundColor(
        this.isHover ? '#0366d6' : this.themeColors.borderColor
      )
      .gesture(
        PanGesture({ direction: PanDirection.Horizontal, distance: 1 })
          .onActionUpdate((event: GestureEvent) => {
            const moveDelta: number = event.offsetX - this.lastPanX;
            this.lastPanX = event.offsetX;
            this.splitRatio += moveDelta / this.containerWidth;
            this.splitRatio = Math.max(
              this.minRatio,
              Math.min(this.maxRatio, this.splitRatio)
            );
          })
          .onActionEnd((): void => {
            this.lastPanX = 0;
          })
      )
      .onHover((isHover: boolean) => {
        this.isHover = isHover;
      })
  }
}
