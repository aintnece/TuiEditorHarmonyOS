import { Editor } from './Editor';
import { EditorCore } from './EditorCore';

/** 全局编辑器上下文 — 绕过 ArkTS 状态传递限制 */
class EditorContext {
  editor: Editor | null = null;
  core: EditorCore | null = null;
}

export const editorContext: EditorContext = new EditorContext();
