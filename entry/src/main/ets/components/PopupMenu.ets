/**
 * PopupMenu — 表格编辑弹出菜单
 *
 * 对标 tui.editor 的 table popup menu。
 * 提供表格行列操作和对齐设置的弹出菜单。
 * 使用条件渲染 + 绝对定位实现，从 EditorPage 管理可见性。
 */

import { ThemeColors } from '../services/ThemeService';

/** 单个菜单项定义 */
export class MenuItem {
  label: string = '';
  action: string = '';
}

@Component
export struct PopupMenu {
  @Prop visible: boolean = false;
  @Prop themeColors: ThemeColors = new ThemeColors();
  /** 菜单项列表 */
  @Prop items: MenuItem[] = [];
  /** 菜单标题 */
  @Prop title: string = '';
  onAction?: (action: string) => void;
  onClose?: () => void;

  build() {
    if (this.visible) {
      Column() {
        // ── 标题 ──
        if (this.title !== '') {
          Text(this.title)
            .fontSize(12)
            .fontColor(this.themeColors.editorPlaceholder)
            .width('100%')
            .textAlign(TextAlign.Start)
            .padding({ left: 12, right: 12, top: 8, bottom: 4 })
        }

        // ── 分隔线 ──
        if (this.title !== '') {
          Divider()
            .width('100%')
            .height(1)
            .color(this.themeColors.borderColor)
        }

        // ── 菜单项 ──
        ForEach(this.items, (item: MenuItem) => {
          Row() {
            Text(item.label)
              .fontSize(13)
              .fontColor(this.themeColors.editorFg)
              .width('100%')
              .textAlign(TextAlign.Start)
          }
          .width('100%')
          .height(32)
          .padding({ left: 12, right: 12 })
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            if (this.onAction) {
              this.onAction(item.action);
            }
            if (this.onClose) {
              this.onClose();
            }
          })
          .onHover((isHover: boolean) => {
            // hover 高亮通过状态管理 — 简化处理
          })
        }, (item: MenuItem): string => item.action)

        // ── 底部分隔 + 关闭 ──
        Divider()
          .width('100%')
          .height(1)
          .color(this.themeColors.borderColor)

        Row() {
          Text('关闭')
            .fontSize(12)
            .fontColor(this.themeColors.editorPlaceholder)
            .width('100%')
            .textAlign(TextAlign.Center)
        }
        .width('100%')
        .height(28)
        .padding({ left: 12, right: 12 })
        .onClick(() => {
          if (this.onClose) {
            this.onClose();
          }
        })
      }
      .width(160)
      .backgroundColor(this.themeColors.toolbarBg)
      .border({ width: 1, color: this.themeColors.borderColor })
      .borderRadius(8)
      .shadow({ radius: 8, color: 'rgba(0,0,0,0.15)', offsetX: 0, offsetY: 2 })
      .position({ x: '100%', y: 96 })
      .translate({ x: -172, y: 0 })
      .zIndex(100)
    }
  }
}

/**
 * 创建表格操作菜单项（中文）
 */
export function createTableMenuItemsZh(): MenuItem[] {
  const items: MenuItem[] = [];
  let item: MenuItem;

  item = new MenuItem();
  item.label = '上方插入行';
  item.action = 'addRowAbove';
  items.push(item);

  item = new MenuItem();
  item.label = '下方插入行';
  item.action = 'addRowBelow';
  items.push(item);

  item = new MenuItem();
  item.label = '删除当前行';
  item.action = 'deleteRow';
  items.push(item);

  item = new MenuItem();
  item.label = '左侧插入列';
  item.action = 'addColLeft';
  items.push(item);

  item = new MenuItem();
  item.label = '右侧插入列';
  item.action = 'addColRight';
  items.push(item);

  item = new MenuItem();
  item.label = '删除当前列';
  item.action = 'deleteCol';
  items.push(item);

  item = new MenuItem();
  item.label = '左对齐';
  item.action = 'alignLeft';
  items.push(item);

  item = new MenuItem();
  item.label = '居中对齐';
  item.action = 'alignCenter';
  items.push(item);

  item = new MenuItem();
  item.label = '右对齐';
  item.action = 'alignRight';
  items.push(item);

  return items;
}

/**
 * 创建表格操作菜单项（英文）
 */
export function createTableMenuItemsEn(): MenuItem[] {
  const items: MenuItem[] = [];
  let item: MenuItem;

  item = new MenuItem();
  item.label = 'Add Row Above';
  item.action = 'addRowAbove';
  items.push(item);

  item = new MenuItem();
  item.label = 'Add Row Below';
  item.action = 'addRowBelow';
  items.push(item);

  item = new MenuItem();
  item.label = 'Delete Row';
  item.action = 'deleteRow';
  items.push(item);

  item = new MenuItem();
  item.label = 'Add Column Left';
  item.action = 'addColLeft';
  items.push(item);

  item = new MenuItem();
  item.label = 'Add Column Right';
  item.action = 'addColRight';
  items.push(item);

  item = new MenuItem();
  item.label = 'Delete Column';
  item.action = 'deleteCol';
  items.push(item);

  item = new MenuItem();
  item.label = 'Align Left';
  item.action = 'alignLeft';
  items.push(item);

  item = new MenuItem();
  item.label = 'Align Center';
  item.action = 'alignCenter';
  items.push(item);

  item = new MenuItem();
  item.label = 'Align Right';
  item.action = 'alignRight';
  items.push(item);

  return items;
}
