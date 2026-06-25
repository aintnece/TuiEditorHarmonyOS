/**
 * Index — 首页（文件列表）
 *
 * 展示最近打开的文件列表，点击进入 EditorPage。
 * 对标 tui.editor 的入口 —— 这里简单实现文件列表。
 */

import { router } from '@kit.ArkUI';
import { ThemeService, ThemeColors } from '../services/ThemeService';

class NavData {
  filePath: string = '';
  fileName: string = '';
}

interface FileItem {
  name: string;
  path: string;
}

@Entry
@Component
struct Index {
  @State private theme: ThemeColors = ThemeService.getInstance().getTheme();
  @State private files: FileItem[] = [
    { name: '欢迎文档.md', path: '' },
  ];

  aboutToAppear(): void {
    ThemeService.getInstance().onThemeChange((t: ThemeColors): void => { this.theme = t; });
    // 实际项目中应读取文件列表
  }

  build() {
    Column() {
      // 标题栏
      Row() {
        Text('TUI Editor')
          .fontSize(24)
          .fontWeight(700)
          .fontColor(this.theme.toolbarFg)
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .backgroundColor(this.theme.toolbarBg)
      .border({ width: { bottom: 1 }, color: this.theme.borderColor })

      // 新建文档按钮
      Button('+ 新建 Markdown 文档')
        .width('90%')
        .height(44)
        .margin({ top: 20, bottom: 12 })
        .fontSize(15)
        .fontColor('#ffffff')
        .backgroundColor(this.theme.toolbarActive)
        .borderRadius(8)
        .onClick(() => {
          const data = new NavData();
          data.fileName = '未命名文档.md';
          data.filePath = '';
          router.pushUrl({ url: 'pages/EditorPage', params: data });
        })

      // 最近文档列表
      List() {
        ForEach(this.files, (file: FileItem) => {
          ListItem() {
            Row() {
              Text('📄 ' + file.name)
                .fontSize(16)
                .fontColor(this.theme.editorFg)
                .layoutWeight(1)
            }
            .width('100%')
            .height(48)
            .padding({ left: 16, right: 16 })
            .border({ width: { bottom: 1 }, color: this.theme.borderColor })
          }
          .onClick(() => {
            const data = new NavData();
            data.fileName = file.name;
            data.filePath = file.path;
            router.pushUrl({ url: 'pages/EditorPage', params: data });
          })
        })
      }
      .width('100%')
      .layoutWeight(1)

      // 底部信息
      Text('TUI Editor v1.0.0 — HarmonyOS Edition')
        .fontSize(12)
        .fontColor(this.theme.editorPlaceholder)
        .margin({ bottom: 12 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.editorBg)
  }
}
