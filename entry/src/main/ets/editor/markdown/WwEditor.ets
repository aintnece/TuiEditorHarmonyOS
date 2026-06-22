/**
 * WwEditor — WYSIWYG 编辑器组件
 *
 * 基于 WebView 加载 tui.editor v3.2.2 wysiwyg 模式。
 * 所有资源通过 onInterceptRequest 从 rawfile/tui-editor/ 本地加载，
 * 使用自定义域名 https://wweditor.local 保证合法 origin（CORS 字体可加载）。
 *
 * 对标 MdPreview 的 WebView/onInterceptRequest/rawfile/getMimeType 结构。
 *
 * 注意：focusable(true) — WYSIWYG 需要接收键盘输入，与 MdPreview 的 focusable(false) 不同。
 */

import { webview } from '@kit.ArkWeb';
import { resourceManager } from '@kit.LocalizationKit';
import { ThemeColors } from '../../services/ThemeService';
import { editorContext } from '../EditorContext';

const WW_HOST: string = 'https://wweditor.local';

@Component
export struct WwEditor {
  @Prop themeColors: ThemeColors;
  @Prop fontSize: number = 16;

  onControllerReady?: (ctrl: webview.WebviewController) => void;

  private controller: webview.WebviewController = new webview.WebviewController();
  private isReady: boolean = false;
  private pageUrl: string = '';

  aboutToAppear(): void {
    // Build page URL with theme query parameter
    const theme: string = this.themeColors.isDark ? 'dark' : 'light';
    this.pageUrl = WW_HOST + '/editor.html?theme=' + theme;

    if (this.onControllerReady) {
      this.onControllerReady(this.controller);
    }
  }

  build() {
    Web({ src: this.pageUrl, controller: this.controller })
      .width('100%')
      .height('100%')
      .backgroundColor(this.themeColors.editorBg)
      .javaScriptAccess(true)
      .domStorageAccess(true)
      .focusable(true)
      .onInterceptRequest((event) => {
        if (!event) return null;

        const url: string = event.request.getRequestUrl();

        // Intercept all requests under https://wweditor.local/ → serve from rawfile/tui-editor/
        if (url.startsWith(WW_HOST + '/')) {
          let relPath: string = url.substring(WW_HOST.length + 1);
          const qIdx: number = relPath.indexOf('?');
          if (qIdx >= 0) {
            relPath = relPath.substring(0, qIdx);
          }
          const hIdx: number = relPath.indexOf('#');
          if (hIdx >= 0) {
            relPath = relPath.substring(0, hIdx);
          }
          const rawPath: string = 'tui-editor/' + relPath;

          const resp: WebResourceResponse = new WebResourceResponse();
          resp.setResponseEncoding('utf-8');
          resp.setResponseMimeType(this.getMimeType(relPath));
          resp.setResponseCode(200);
          resp.setReasonMessage('OK');

          try {
            const ctx: resourceManager.ResourceManager = getContext(this).resourceManager;
            const data: Uint8Array = ctx.getRawFileContentSync(rawPath);

            // Must copy buffer to avoid shared-buffer offset issues
            const copy: Uint8Array = new Uint8Array(data.byteLength);
            copy.set(data);
            resp.setResponseData(copy.buffer);

            resp.setResponseHeader([{
              headerKey: 'Access-Control-Allow-Origin',
              headerValue: WW_HOST
            }]);
            resp.setResponseIsReady(true);
            return resp;
          } catch (e) {
            // rawfile not found → let WebView fall back to default handling
            return null;
          }
        }

        return null;
      })
      .onPageEnd((): void => {
        if (!this.isReady) {
          this.isReady = true;
          this.applyInitial();
        }
      })
  }

  // ── Initial content injection ──

  /**
   * After first page load, inject initial markdown content and theme
   * into the tui.editor instance via the __ww bridge.
   */
  private applyInitial(): void {
    const core = editorContext.core;
    const initialMd: string = core ? core.getMarkdown() : '';

    if (initialMd.length > 0) {
      const escaped: string = encodeURIComponent(initialMd);
      this.controller.runJavaScript(
        'window.__ww && window.__ww.setMarkdown(decodeURIComponent("' + escaped + '"))'
      );
    }

    // Sync theme (in case it changed between aboutToAppear and onPageEnd)
    const isDarkStr: string = this.themeColors.isDark ? 'true' : 'false';
    this.controller.runJavaScript(
      'window.__ww && window.__ww.setTheme(' + isDarkStr + ')'
    );
  }

  // ── MIME type mapping ──

  private getMimeType(path: string): string {
    if (path.endsWith('.html')) return 'text/html';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.woff2')) return 'font/woff2';
    if (path.endsWith('.woff')) return 'font/woff';
    if (path.endsWith('.ttf')) return 'font/ttf';
    return 'text/html';
  }
}
