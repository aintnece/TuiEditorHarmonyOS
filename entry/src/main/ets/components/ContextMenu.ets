/**
 * ContextMenu — 右键/长按上下文菜单
 *
 * 对标 tui.editor 的 context menu。
 * 在编辑区右键/长按时弹出，提供复制、剪切、粘贴、全选、撤销、重做。
 * 使用 Stack + position() 模式（非 bindPopup — 兼容性问题）。
 */

import { ThemeColors } from '../services/ThemeService';

/** 上下文菜单操作类型 */
export enum ContextMenuAction {
  Copy = 'copy',
  Cut = 'cut',
  Paste = 'paste',
  SelectAll = 'selectAll',
  Undo = 'undo',
  Redo = 'redo',
}

@Component
export struct ContextMenu {
  @Prop visible: boolean = false;
  @Prop themeColors: ThemeColors = new ThemeColors();
  /** 菜单左上角 X 坐标 (vp, 相对父 Stack) */
  @Prop posX: number = 0;
  /** 菜单左上角 Y 坐标 (vp, 相对父 Stack) */
  @Prop posY: number = 0;
  onAction?: (action: ContextMenuAction) => void;
  onClose?: () => void;

  build() {
    if (this.visible) {
      Column() {
        // ── 复制 ──
        Row() {
          Text('复制')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.Copy);
          }
          if (this.onClose) {
            this.onClose();
          }
        })

        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        // ── 剪切 ──
        Row() {
          Text('剪切')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.Cut);
          }
          if (this.onClose) {
            this.onClose();
          }
        })

        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        // ── 粘贴 ──
        Row() {
          Text('粘贴')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.Paste);
          }
          if (this.onClose) {
            this.onClose();
          }
        })

        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        // ── 全选 ──
        Row() {
          Text('全选')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.SelectAll);
          }
          if (this.onClose) {
            this.onClose();
          }
        })

        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        // ── 撤销 ──
        Row() {
          Text('撤销')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.Undo);
          }
          if (this.onClose) {
            this.onClose();
          }
        })

        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        // ── 重做 ──
        Row() {
          Text('重做')
            .fontSize(13)
            .fontColor(this.themeColors.editorFg)
            .width('100%')
            .textAlign(TextAlign.Start)
        }
        .width('100%')
        .height(36)
        .padding({ left: 12, right: 12 })
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          if (this.onAction) {
            this.onAction(ContextMenuAction.Redo);
          }
          if (this.onClose) {
            this.onClose();
          }
        })
      }
      .width(160)
      .backgroundColor(this.themeColors.popupBg)
      .border({ width: 1, color: this.themeColors.popupBorder })
      .borderRadius(8)
      .shadow({ radius: 8, color: this.themeColors.popupShadow, offsetX: 0, offsetY: 2 })
      .position({ x: this.posX, y: this.posY })
      .zIndex(100)
    }
  }
}
