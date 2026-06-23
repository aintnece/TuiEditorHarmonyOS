/**
 * MarkdownCommands — 内置 Markdown 编辑命令
 *
 * 对标 tui.editor 的 markdown 模式的工具栏命令。
 * 每个命令接收 EditorState，返回修改后的新 EditorState。
 */

import { Command, UndoableCommand } from '../CommandManager';
import { EditorState } from '../../EditorType';
import { Selection } from '../../selection/Selection';

// ═══════════════════════════════════════════════════════════
//  行内格式命令
// ═══════════════════════════════════════════════════════════

/** 加粗 **text** */
export const BoldCommand: UndoableCommand = {
  name: 'Bold',
  execute(state: EditorState): EditorState {
    return wrapSelection(state, '**', '**', '粗体文本');
  },
  undo(state: EditorState): EditorState {
    // CommandManager.undo() uses full snapshots (prevState) from the undo stack.
    // Individual command undo() methods are not called during normal undo/redo.
    // This stub is kept for interface compatibility — it just returns a snapshot.
    return state.snapshot();
  }
};

/** 斜体 *text* */
export const ItalicCommand: UndoableCommand = {
  name: 'Italic',
  execute(state: EditorState): EditorState {
    return wrapSelection(state, '*', '*', '斜体文本');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 删除线 ~~text~~ */
export const StrikeCommand: UndoableCommand = {
  name: 'Strike',
  execute(state: EditorState): EditorState {
    return wrapSelection(state, '~~', '~~', '删除文本');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 行内代码 `code` */
export const CodeCommand: UndoableCommand = {
  name: 'Code',
  execute(state: EditorState): EditorState {
    return wrapSelection(state, '`', '`', '代码');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

// ═══════════════════════════════════════════════════════════
//  块级命令
// ═══════════════════════════════════════════════════════════

/** 标题 # */
export const HeadingCommand: UndoableCommand = {
  name: 'Heading',
  execute(state: EditorState, ...args: string[]): EditorState {
    const level: number = args.length > 0 ? parseInt(args[0]) : 2;
    let prefix: string = '';
    for (let i = 0; i < level; i++) prefix += '#';
    return prefixLine(state, prefix + ' ', '标题');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 引用 > */
export const QuoteCommand: UndoableCommand = {
  name: 'Quote',
  execute(state: EditorState): EditorState {
    return prefixLine(state, '> ', '引用文本');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 无序列表 - */
export const BulletListCommand: UndoableCommand = {
  name: 'BulletList',
  execute(state: EditorState): EditorState {
    return prefixLine(state, '- ', '列表项');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 有序列表 1. */
export const OrderedListCommand: UndoableCommand = {
  name: 'OrderedList',
  execute(state: EditorState): EditorState {
    return prefixLine(state, '1. ', '列表项');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 任务列表 - [ ] */
export const TaskListCommand: UndoableCommand = {
  name: 'TaskList',
  execute(state: EditorState): EditorState {
    return prefixLine(state, '- [ ] ', '任务项');
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 代码块 ``` */
export const CodeBlockCommand: UndoableCommand = {
  name: 'Codeblock',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;
    const selEnd: number = state.selectionEnd;

    let selectedText: string = '';
    if (selStart < selEnd) {
      selectedText = md.substring(selStart, selEnd);
    }

    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, selStart)
      + '\n```\n' + (selectedText !== '' ? selectedText : '代码块') + '\n```\n'
      + md.substring(selEnd);
    result.selectionStart = selStart + 4;
    result.selectionEnd = selStart + 4 + (selectedText !== '' ? selectedText.length : 3);
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 分割线 --- */
export const HorizontalRuleCommand: UndoableCommand = {
  name: 'HorizontalRule',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;

    const prefix: string = (selStart > 0 && md[selStart - 1] !== '\n') ? '\n' : '';
    const hr: string = prefix + '---\n';

    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, selStart) + hr + md.substring(selStart);
    result.selectionStart = selStart + hr.length;
    result.selectionEnd = result.selectionStart;
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 链接 [text](url) */
export const LinkCommand: UndoableCommand = {
  name: 'Link',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;
    const selEnd: number = state.selectionEnd;

    let linkText: string = '链接文本';
    if (selStart < selEnd) {
      linkText = md.substring(selStart, selEnd);
    }

    const snippet: string = '[' + linkText + '](url)';
    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, selStart) + snippet + md.substring(selEnd);
    // 光标定位到 url 处
    result.selectionStart = selStart + snippet.length - 4;
    result.selectionEnd = selStart + snippet.length - 1;
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 图片 ![alt](url) */
export const ImageCommand: UndoableCommand = {
  name: 'Image',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;

    const snippet: string = '![替代文本](url)';
    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, selStart) + snippet + md.substring(selStart);
    result.selectionStart = selStart + snippet.length - 4;
    result.selectionEnd = selStart + snippet.length - 1;
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 缩进 — 行首加 2 个空格 */
export const IndentCommand: UndoableCommand = {
  name: 'Indent',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;

    // 定位当前行首
    let lineStart: number = selStart;
    while (lineStart > 0 && md[lineStart - 1] !== '\n') {
      lineStart--;
    }

    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, lineStart) + '  ' + md.substring(lineStart);
    result.selectionStart = state.selectionStart + 2;
    result.selectionEnd = state.selectionEnd + 2;
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 减少缩进 — 删除行首至多 2 个空格或 1 个 tab */
export const OutdentCommand: UndoableCommand = {
  name: 'Outdent',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;

    // 定位当前行首
    let lineStart: number = selStart;
    while (lineStart > 0 && md[lineStart - 1] !== '\n') {
      lineStart--;
    }

    // 计算可删除的缩进字符数
    let removed: number = 0;
    if (md[lineStart] === '\t') {
      removed = 1;
    } else {
      // 数行首连续空格数（不用正则）
      let n: number = 0;
      let i: number = lineStart;
      while (i < md.length && md[i] === ' ') {
        n++;
        i++;
      }
      // 至多删 2 个
      if (n >= 2) {
        removed = 2;
      } else if (n === 1) {
        removed = 1;
      } else {
        removed = 0;
      }
    }

    if (removed === 0) {
      return state;
    }

    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, lineStart) + md.substring(lineStart + removed);
    result.selectionStart = Math.max(lineStart, state.selectionStart - removed);
    result.selectionEnd = Math.max(lineStart, state.selectionEnd - removed);
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 表格模板 */
export const TableCommand: UndoableCommand = {
  name: 'Table',
  execute(state: EditorState): EditorState {
    const md: string = state.markdown;
    const selStart: number = state.selectionStart;

    const tableTemplate: string =
      '\n| 列 1 | 列 2 | 列 3 |\n' +
      '|------|------|------|\n' +
      '| 内容 | 内容 | 内容 |\n';

    const prefix: string = (selStart > 0 && md[selStart - 1] !== '\n') ? '\n' : '';
    const result: EditorState = state.snapshot();
    result.markdown = md.substring(0, selStart) + prefix + tableTemplate + md.substring(selStart);
    result.selectionStart = selStart + prefix.length + 2;
    result.selectionEnd = result.selectionStart;
    result.isDirty = true;
    return result;
  },
  undo(state: EditorState): EditorState {
    // Undo via snapshots — see BoldCommand comment.
    return state.snapshot();
  }
};

/** 撤销（通过 CommandManager 调用，这里作为占位） */
export const UndoCommand: Command = {
  name: 'Undo',
  execute(state: EditorState): EditorState {
    // 实际撤销由 CommandManager.undo() 处理
    return state;
  }
};

/** 重做 */
export const RedoCommand: Command = {
  name: 'Redo',
  execute(state: EditorState): EditorState {
    return state;
  }
};

// ═══════════════════════════════════════════════════════════
//  辅助函数
// ═══════════════════════════════════════════════════════════

/**
 * 用前后缀包裹选中文本（若无选区则插入占位符）。
 */
function wrapSelection(
  state: EditorState,
  prefix: string,
  suffix: string,
  placeholder: string
): EditorState {
  const md: string = state.markdown;
  let selStart: number = state.selectionStart;
  let selEnd: number = state.selectionEnd;

  // Fallback to last valid selection if current selection has no range
  if (selStart === selEnd && state.lastSelectionStart >= 0 && state.lastSelectionStart < state.lastSelectionEnd) {
    selStart = state.lastSelectionStart;
    selEnd = state.lastSelectionEnd;
  }

  let selectedText: string = placeholder;
  if (selStart < selEnd) {
    selectedText = md.substring(selStart, selEnd);
  }

  const wrapped: string = prefix + selectedText + suffix;
  const result: EditorState = state.snapshot();
  result.markdown = md.substring(0, selStart) + wrapped + md.substring(selEnd);
  result.selectionStart = selStart + prefix.length;
  result.selectionEnd = selStart + prefix.length + selectedText.length;
  result.isDirty = true;
  return result;
}

/**
 * 在当前行前添加前缀（若无选区则新行）。
 */
function prefixLine(
  state: EditorState,
  prefix: string,
  placeholder: string
): EditorState {
  const md: string = state.markdown;
  const selStart: number = state.selectionStart;

  // 找到当前行首
  let lineStart: number = selStart;
  while (lineStart > 0 && md[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // 需要在前缀前加换行吗？
  let needNewline: boolean = false;
  if (lineStart > 0) {
    needNewline = md[lineStart - 1] !== '\n';
  }
  const fullPrefix: string = (needNewline ? '\n' : '') + prefix;

  const result: EditorState = state.snapshot();
  result.markdown = md.substring(0, lineStart) + fullPrefix + md.substring(lineStart);
  result.selectionStart = lineStart + fullPrefix.length;
  result.selectionEnd = result.selectionStart;
  result.isDirty = true;
  return result;
}

/** 获取所有内置命令 */
export function getBuiltinCommands(): UndoableCommand[] {
  const cmds: UndoableCommand[] = [];
  cmds.push(BoldCommand);
  cmds.push(ItalicCommand);
  cmds.push(StrikeCommand);
  cmds.push(CodeCommand);
  cmds.push(HeadingCommand);
  cmds.push(QuoteCommand);
  cmds.push(BulletListCommand);
  cmds.push(OrderedListCommand);
  cmds.push(TaskListCommand);
  cmds.push(CodeBlockCommand);
  cmds.push(HorizontalRuleCommand);
  cmds.push(IndentCommand);
  cmds.push(OutdentCommand);
  cmds.push(LinkCommand);
  cmds.push(ImageCommand);
  cmds.push(TableCommand);
  return cmds;
}
