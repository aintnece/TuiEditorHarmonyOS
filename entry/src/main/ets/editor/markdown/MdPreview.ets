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
import fs from '@ohos.file.fs';
import { EditorCore } from '../EditorCore';
import { ThemeColors } from '../../services/ThemeService';
import { Handler } from '../../event/EventEmitter';
import { editorContext } from '../EditorContext';

const APP_URL: string = 'https://markdown.local/preview';
const KATEX_PREFIX: string = 'https://unpkg.com/katex@0.16.22/';
const PRISM_PREFIX: string = 'https://markdown.local/prismassets/';
const USERIMG_PREFIX: string = 'https://markdown.local/userimg/';

@Component
export struct MdPreview {
  @Prop themeColors: ThemeColors;
  @Prop fontSize: number = 16;

  onControllerReady?: (ctrl: webview.WebviewController) => void;

  private controller: webview.WebviewController = new webview.WebviewController();
  private isReady: boolean = false;
  private debounceTimer: number = 0;
  private lastRendered: string = '';
  private currentHtml: string = '';
  private bodyOnly: boolean = false;
  private changeHandler: Handler = (): void => {};

  aboutToAppear(): void {
    if (!editorContext.core) return;

    const self: MdPreview = this;

    // 监听 EditorCore 内容变更，300ms 防抖后更新预览
    this.changeHandler = (): void => {
      if (!self.isReady) return;
      if (self.debounceTimer !== 0) {
        clearTimeout(self.debounceTimer);
      }
      self.debounceTimer = setTimeout((): void => {
        self.debounceTimer = 0;
        self.doRender();
      }, 300);
    };
    editorContext.core.on('change', this.changeHandler);

    if (this.onControllerReady) {
      this.onControllerReady(this.controller);
    }
  }

  aboutToDisappear(): void {
    if (!editorContext.core) return;

    editorContext.core.off('change', this.changeHandler);
    if (this.debounceTimer !== 0) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = 0;
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

        // 拦截 Prism 请求 → 返回本地 rawfile
        if (url.startsWith(PRISM_PREFIX)) {
          const path: string = url.substring(PRISM_PREFIX.length);
          const resp = new WebResourceResponse();
          resp.setResponseEncoding('utf-8');
          resp.setResponseMimeType(this.getMimeType(path));
          resp.setResponseCode(200);
          resp.setReasonMessage('OK');

          try {
            const ctx: resourceManager.ResourceManager = getContext(this).resourceManager;
            const rawPath: string = 'prism/' + path;
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

        // 拦截用户图片请求 → 从沙箱 filesDir/userimg 读
        if (url.startsWith(USERIMG_PREFIX)) {
          const rel: string = 'userimg/' + url.substring(USERIMG_PREFIX.length);
          const resp = new WebResourceResponse();
          resp.setResponseEncoding('utf-8');
          resp.setResponseMimeType(this.getMimeType(rel));
          resp.setResponseCode(200);
          resp.setReasonMessage('OK');
          try {
            const filePath: string = getContext(this).filesDir + '/' + rel;
            const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
            const stat = fs.statSync(filePath);
            const buf: ArrayBuffer = new ArrayBuffer(stat.size);
            fs.readSync(file.fd, buf);
            fs.closeSync(file);
            resp.setResponseData(buf);
            resp.setResponseHeader([{ headerKey: 'Access-Control-Allow-Origin', headerValue: 'https://markdown.local' }]);
            resp.setResponseIsReady(true);
            return resp;
          } catch (e) {
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
    if (!editorContext.core) return;

    const markdown: string = editorContext.core.getMarkdown();
    if (markdown === this.lastRendered) return;

    try {
      const bodyHtml: string = editorContext.core.getHTML();
      this.lastRendered = markdown;

      if (!this.bodyOnly) {
        // 首次加载：构造完整 HTML 页面（含 KaTeX），通过 loadUrl 触发拦截器加载
        let fullHtml: string = editorContext.core.getFullHTML();
        fullHtml = this.injectKatex(fullHtml);
        fullHtml = this.injectPrism(fullHtml);
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
          '  if (typeof Prism !== "undefined") {' +
          '    Prism.highlightAllUnder(article);' +
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

  // ── Prism 代码高亮注入 ──

  /**
   * 在完整 HTML 页面中注入 Prism CSS / JS 引用。
   * 用 split/join 替代正则，遵守 ArkTS 严格模式。
   */
  private injectPrism(html: string): string {
    const prismCss: string =
      '<link rel="stylesheet" href="' + PRISM_PREFIX + (this.themeColors.isDark ? 'prism-tomorrow.min.css' : 'prism-light.min.css') + '">';

    const prismJs: string =
      '<script src="' + PRISM_PREFIX + 'prism.js"></' + 'script>';
    const prismInit: string =
      '<script>' +
      'document.addEventListener("DOMContentLoaded", function() {' +
      '  if (typeof Prism !== "undefined") {' +
      '    Prism.highlightAll();' +
      '  }' +
      '});' +
      '</' + 'script>';

    let result: string = html;
    // 在 </head> 前注入 Prism CSS
    result = result.split('</head>').join(prismCss + '\n</head>');

    // 在 </body> 前注入 Prism JS + 初始化
    result = result.split('</body>').join(prismJs + '\n' + prismInit + '\n</body>');

    return result;
  }

  // ── MIME 类型映射 ──

  private getMimeType(path: string): string {
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.woff2')) return 'font/woff2';
    if (path.endsWith('.woff')) return 'font/woff';
    if (path.endsWith('.ttf')) return 'font/ttf';
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
    if (path.endsWith('.gif')) return 'image/gif';
    if (path.endsWith('.webp')) return 'image/webp';
    if (path.endsWith('.bmp')) return 'image/bmp';
    return 'text/html';
  }
}
