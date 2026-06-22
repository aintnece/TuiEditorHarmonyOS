/**
 * ExportSheet — 导出对话框
 *
 * 对标 tui.editor 的导出功能。
 * 将 Markdown 渲染为完整 HTML 并导出。
 * 通过 editorContext 全局单例获取编辑器内容。
 */

import { pasteboard } from '@kit.BasicServicesKit';
import { ThemeColors } from '../services/ThemeService';
import { editorContext } from '../editor/EditorContext';

/** 导出选项 */
export class ExportOptions {
  inlineKatex: boolean = true;
  inlinePrism: boolean = true;
  externalCss: boolean = false;
}

@Component
export struct ExportSheet {
  @Prop themeColors: ThemeColors = new ThemeColors();
  @Prop visible: boolean = false;

  @State private inlineKatex: boolean = true;
  @State private inlinePrism: boolean = false;
  @State private copySuccess: boolean = false;

  /** 关闭回调 */
  onClose?: () => void;
  /** 导出回调 */
  onExport?: (options: ExportOptions) => void;

  /** 构建完整 HTML 页面 */
  private buildHtml(): string {
    if (!editorContext.core) return '';

    const bodyHtml: string = editorContext.core.getFullHTML();
    const katexCdn: string = this.inlineKatex
      ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css">\n' +
        '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.js"></script>\n' +
        '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/contrib/auto-render.min.js"></script>\n' +
        '<script>document.addEventListener("DOMContentLoaded",function(){renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}]})});</script>\n'
      : '';

    const prismCdn: string = this.inlinePrism
      ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css">\n' +
        '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>\n' +
        '<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>\n'
      : '';

    const html: string =
      '<!DOCTYPE html>\n' +
      '<html lang="zh-CN">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>导出的文档</title>\n' +
      '  <style>\n' +
      '    body { max-width: 800px; margin: 0 auto; padding: 2em; ' +
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' +
      'line-height: 1.6; color: #333; }\n' +
      '    pre { background: #f6f8fa; padding: 1em; border-radius: 6px; overflow-x: auto; }\n' +
      '    code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }\n' +
      '    blockquote { border-left: 3px solid #0366d6; margin: 0; padding: 0.5em 1em; ' +
      'background: #f6f8fa; }\n' +
      '    table { border-collapse: collapse; width: 100%; margin: 1em 0; }\n' +
      '    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }\n' +
      '    th { background: #f6f8fa; font-weight: 600; }\n' +
      '    img { max-width: 100%; }\n' +
      '  </style>\n' +
      katexCdn +
      prismCdn +
      '</head>\n' +
      '<body>\n' +
      bodyHtml +
      '\n</body>\n' +
      '</html>';

    return html;
  }

  /** 复制到剪贴板 */
  private handleCopy(): void {
    const html: string = this.buildHtml();
    if (html === '') return;

    try {
      const pb = pasteboard.getSystemPasteboard();
      const data = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, html);
      pb.setData(data);
      this.copySuccess = true;
      // 2 秒后自动隐藏提示
      const self: ExportSheet = this;
      setTimeout((): void => {
        self.copySuccess = false;
      }, 2000);
    } catch (_e) {
      // 剪贴板不可用时静默失败
    }
  }

  /** 处理导出 */
  private handleExport(): void {
    const opts: ExportOptions = new ExportOptions();
    opts.inlineKatex = this.inlineKatex;
    opts.inlinePrism = this.inlinePrism;
    if (this.onExport) {
      this.onExport(opts);
    }
  }

  /** 关闭 */
  private handleClose(): void {
    if (this.onClose) {
      this.onClose();
    }
  }

  build() {
    if (this.visible) {
      Stack({ alignContent: Alignment.Center }) {
        // 半透明遮罩
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor('rgba(0,0,0,0.4)')
          .onClick(() => { this.handleClose(); })

        // 对话框主体
        Column() {
          // 标题
          Text('导出文档')
            .fontSize(18)
            .fontWeight(600)
            .fontColor(this.themeColors.popupFg)
            .width('100%')
            .padding({ left: 20, top: 20, bottom: 8 })

          // ── 选项 ──
          Column() {
            // KaTeX 选项
            Row() {
              Text('内联 KaTeX (数学公式)')
                .fontSize(14)
                .fontColor(this.themeColors.popupFg)
                .layoutWeight(1)

              Toggle({ type: ToggleType.Switch, isOn: this.inlineKatex })
                .onChange((value: boolean) => {
                  this.inlineKatex = value;
                })
            }
            .width('100%')
            .height(40)
            .padding({ left: 20, right: 20 })

            // Prism 选项
            Row() {
              Text('内联 Prism.js (代码高亮)')
                .fontSize(14)
                .fontColor(this.themeColors.popupFg)
                .layoutWeight(1)

              Toggle({ type: ToggleType.Switch, isOn: this.inlinePrism })
                .onChange((value: boolean) => {
                  this.inlinePrism = value;
                })
            }
            .width('100%')
            .height(40)
            .padding({ left: 20, right: 20 })
          }
          .width('100%')
          .padding({ top: 4, bottom: 12 })

          // ── 预览区域（简化版） ──
          Column() {
            Text('HTML 预览 (前 500 字符)')
              .fontSize(12)
              .fontColor(this.themeColors.editorPlaceholder)
              .padding({ left: 8, top: 8 })

            Scroll() {
              Text(this.buildHtml().substring(0, 500) + '...')
                .fontSize(11)
                .fontColor(this.themeColors.popupFg)
                .fontFamily('monospace')
                .padding(8)
                .width('100%')
                .textAlign(TextAlign.Start)
            }
            .width('100%')
            .height(120)
            .backgroundColor(this.themeColors.editorGutter)
            .borderRadius(6)
            .border({ width: 1, color: this.themeColors.borderColor })
            .margin({ left: 20, right: 20 })
          }
          .width('100%')

          // ── 复制成功提示 ──
          if (this.copySuccess) {
            Text('已复制到剪贴板！')
              .fontSize(12)
              .fontColor('#28a745')
              .margin({ top: 8 })
          }

          // ── 底部按钮 ──
          Row() {
            // 取消按钮
            Button('取消')
              .fontSize(13)
              .height(32)
              .padding({ left: 16, right: 16 })
              .backgroundColor(this.themeColors.toolbarHover)
              .fontColor(this.themeColors.toolbarFg)
              .borderRadius(4)
              .onClick(() => { this.handleClose(); })

            Blank()

            // 复制到剪贴板
            Button('复制 HTML')
              .fontSize(13)
              .height(32)
              .padding({ left: 16, right: 16 })
              .backgroundColor(this.themeColors.toolbarBg)
              .fontColor(this.themeColors.toolbarFg)
              .borderRadius(4)
              .border({ width: 1, color: this.themeColors.borderColor })
              .onClick(() => { this.handleCopy(); })
              .margin({ right: 8 })

            // 导出 HTML
            Button('导出 HTML')
              .fontSize(13)
              .height(32)
              .padding({ left: 16, right: 16 })
              .backgroundColor(this.themeColors.toolbarActive)
              .fontColor('#ffffff')
              .borderRadius(4)
              .onClick(() => { this.handleExport(); })
          }
          .width('100%')
          .padding({ left: 20, right: 20, top: 16, bottom: 20 })
        }
        .width(400)
        .backgroundColor(this.themeColors.popupBg)
        .borderRadius(12)
        .shadow({ radius: 16, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 4 })
      }
      .width('100%')
      .height('100%')
      .position({ x: 0, y: 0 })
    }
  }
}
