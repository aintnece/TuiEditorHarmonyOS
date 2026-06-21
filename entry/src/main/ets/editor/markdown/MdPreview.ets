/**
 * MdPreview — Markdown 预览组件
 *
 * 对标 tui.editor 的 Preview 组件。基于 WebView，使用
 * runJavaScript 实现无闪烁增量更新。KaTeX 数学公式通过
 * onInterceptRequest 拦截 CDN 请求，返回本地 rawfile 资源。
 *
 * 参考来源：F:\MarkdownEditor\entry\src\main\ets\components\MarkdownPreview.ets
 */

import { webview } from '@kit.ArkWeb';
import { resourceManager } from '@kit.LocalizationKit';
import { EditorCore } from '../EditorCore';
import { ThemeColors } from '../../services/ThemeService';

const APP_URL: string = 'https://markdown.local/preview';
const KATEX_PREFIX: string = 'https://unpkg.com/katex@0.16.22/';

@Component
export struct MdPreview {
  @Prop editorCore: EditorCore;
  @Prop themeColors: ThemeColors;
  @Prop fontSize: number = 16;

  onControllerReady?: (ctrl: webview.WebviewController) => void;

  private controller: webview.WebviewController = new webview.WebviewController();
  private isReady: boolean = false;
  private debounceTimer: number = 0;
  private lastRendered: string = '';
  private currentHtml: string = '';
  private bodyOnly: boolean = false;

  aboutToAppear(): void {
    const self: MdPreview = this;

    // 监听 EditorCore 内容变更，300ms 防抖后更新预览
    this.editorCore.on('change', (): void => {
      if (!self.isReady) return;
      if (self.debounceTimer !== 0) {
        clearTimeout(self.debounceTimer);
      }
      self.debounceTimer = setTimeout((): void => {
        self.debounceTimer = 0;
        self.doRender();
      }, 300);
    });

    if (this.onControllerReady) {
      this.onControllerReady(this.controller);
    }
  }

  build() {
    Web({ src: APP_URL, controller: this.controller })
      .width('100%')
      .height('100%')
      .backgroundColor(this.themeColors.previewBg)
      .javaScriptAccess(true)
      .domStorageAccess(true)
      .focusable(false)
      .onInterceptRequest((event) => {
        if (!event) return null;

        const url: string = event.request.getRequestUrl();

        // 拦截自定义页面请求 → 返回动态 HTML
        if (url.startsWith(APP_URL)) {
          const resp = new WebResourceResponse();
          resp.setResponseData(this.currentHtml);
          resp.setResponseEncoding('utf-8');
          resp.setResponseMimeType('text/html');
          resp.setResponseCode(200);
          resp.setReasonMessage('OK');
          resp.setResponseIsReady(true);
          return resp;
        }

        // 拦截 KaTeX CDN 请求 → 返回本地 rawfile
        if (url.startsWith(KATEX_PREFIX)) {
          const path: string = url.substring(KATEX_PREFIX.length);
          const resp = new WebResourceResponse();
          resp.setResponseEncoding('utf-8');
          resp.setResponseMimeType(this.getMimeType(path));
          resp.setResponseCode(200);
          resp.setReasonMessage('OK');

          try {
            const ctx: resourceManager.ResourceManager = getContext(this).resourceManager;
            const rawPath: string = 'katex/' + path;
            const data: Uint8Array = ctx.getRawFileContentSync(rawPath);
            const copy: Uint8Array = new Uint8Array(data.byteLength);
            copy.set(data);
            resp.setResponseData(copy.buffer);
            resp.setResponseHeader([{
              headerKey: 'Access-Control-Allow-Origin',
              headerValue: 'https://markdown.local'
            }]);
            resp.setResponseIsReady(true);
            return resp;
          } catch (e) {
            // rawfile 不存在时静默忽略，让 WebView 走默认处理
            return null;
          }
        }

        return null;
      })
      .onPageEnd((): void => {
        if (!this.isReady) {
          this.isReady = true;
          // 首次加载后立即渲染
          this.doRender();
        }
      })
  }

  // ── 渲染逻辑 ──

  private doRender(): void {
    const markdown: string = this.editorCore.getMarkdown();
    if (markdown === this.lastRendered) return;

    try {
      const bodyHtml: string = this.editorCore.getHTML();
      this.lastRendered = markdown;

      if (!this.bodyOnly) {
        // 首次加载：构造完整 HTML 页面（含 KaTeX），通过 loadUrl 触发拦截器加载
        let fullHtml: string = this.editorCore.getFullHTML();
        fullHtml = this.injectKatex(fullHtml);
        this.currentHtml = fullHtml;
        this.controller.loadUrl(APP_URL + '?t=' + Date.now());
        this.bodyOnly = true;
      } else {
        // 后续更新：runJavaScript 原地注入内容，保持滚动位置
        const escaped: string = encodeURIComponent(bodyHtml);
        this.controller.runJavaScript(
          'var article = document.querySelector(".markdown-body");' +
          'if (article) {' +
          '  article.innerHTML = decodeURIComponent("' + escaped + '");' +
          '  if (typeof renderMathInElement !== "undefined") {' +
          '    renderMathInElement(article, {' +
          '      delimiters: [' +
          '        {left: "$$", right: "$$", display: true},' +
          '        {left: "$", right: "$", display: false}' +
          '      ],' +
          '      throwOnError: false' +
          '    });' +
          '  }' +
          '}'
        );
      }
    } catch (err) {
      this.lastRendered = '';
    }
  }

  // ── KaTeX 注入 ──

  /**
   * 在完整 HTML 页面中注入 KaTeX CSS / JS 引用。
   * 用 split/join 替代正则，遵守 ArkTS 严格模式。
   */
  private injectKatex(html: string): string {
    const katexCss: string =
      '<link rel="stylesheet" href="' + KATEX_PREFIX + 'dist/katex.min.css">';

    const katexJs: string =
      '<script src="' + KATEX_PREFIX + 'dist/katex.min.js"></' + 'script>';
    const autoRenderJs: string =
      '<script src="' + KATEX_PREFIX + 'dist/contrib/auto-render.min.js"></' + 'script>';

    const initScript: string =
      '<script>' +
      'document.addEventListener("DOMContentLoaded", function() {' +
      '  if (typeof renderMathInElement !== "undefined") {' +
      '    renderMathInElement(document.body, {' +
      '      delimiters: [' +
      '        {left: "$$", right: "$$", display: true},' +
      '        {left: "$", right: "$", display: false}' +
      '      ],' +
      '      throwOnError: false' +
      '    });' +
      '  }' +
      '});' +
      '</' + 'script>';

    // 在 </head> 前注入 KaTeX CSS
    let result: string = html;
    result = result.split('</head>').join(katexCss + '\n</head>');

    // 在 </body> 前注入 KaTeX JS + auto-render + 初始化
    result = result.split('</body>').join(
      katexJs + '\n' + autoRenderJs + '\n' + initScript + '\n</body>'
    );

    return result;
  }

  // ── MIME 类型映射 ──

  private getMimeType(path: string): string {
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.woff2')) return 'font/woff2';
    if (path.endsWith('.woff')) return 'font/woff';
    if (path.endsWith('.ttf')) return 'font/ttf';
    return 'text/html';
  }
}
