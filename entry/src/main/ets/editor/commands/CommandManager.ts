/**
 * Command — 命令系统
 *
 * 对标 tui.editor 的 commands/command.ts + commands/commandManager.ts。
 * 命令模式：每个编辑操作封装为 Command，支持撤销（undo）和重做（redo）。
 */

import { EditorState } from '../EditorType';

/** 命令接口 — 对标 tui.editor Command */
export interface Command {
  /** 命令名（用于序列化/调试） */
  name: string;

  /** 执行命令，返回新的 EditorState */
  execute(state: EditorState, ...args: string[]): EditorState;
}

/** 可撤销命令（带 undo 实现） */
export interface UndoableCommand extends Command {
  /** 撤销，返回撤销后的状态 */
  undo(state: EditorState): EditorState;
}

/** 历史记录条目 */
class HistoryEntry {
  prevState: EditorState = new EditorState();
  nextState: EditorState = new EditorState();
  commandName: string = '';

  static create(
    prev: EditorState,
    next: EditorState,
    name: string
  ): HistoryEntry {
    const entry: HistoryEntry = new HistoryEntry();
    entry.prevState = prev;
    entry.nextState = next;
    entry.commandName = name;
    return entry;
  }
}

/** 命令管理器 — 对标 tui.editor CommandManager */
export class CommandManager {
  private commands: Command[] = [];
  private commandNames: string[] = [];
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxHistory: number = 100;

  /** 注册命令 */
  register(command: Command): void {
    const idx: number = this.commandNames.indexOf(command.name);
    if (idx >= 0) {
      this.commands[idx] = command; // 覆盖
    } else {
      this.commandNames.push(command.name);
      this.commands.push(command);
    }
  }

  /** 执行命令 */
  execute(name: string, state: EditorState, ...args: string[]): EditorState | null {
    const idx: number = this.commandNames.indexOf(name);
    if (idx < 0) return null;

    const prevState: EditorState = state.snapshot();
    const nextState: EditorState = this.commands[idx].execute(state, ...args);

    // 推入撤销栈
    this.undoStack.push(HistoryEntry.create(prevState, nextState, name));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.splice(0, 1); // 删除最旧
    }

    // 清空重做栈（新操作后不可重做）
    this.redoStack.length = 0;

    return nextState;
  }

  /** 撤销 */
  undo(currentState: EditorState): EditorState | null {
    if (this.undoStack.length === 0) return null;

    const entry: HistoryEntry = this.undoStack[this.undoStack.length - 1];
    this.undoStack.splice(this.undoStack.length - 1, 1);

    // 当前状态推入重做栈
    this.redoStack.push(HistoryEntry.create(entry.prevState, currentState, entry.commandName));

    return entry.prevState;
  }

  /** 重做 */
  redo(currentState: EditorState): EditorState | null {
    if (this.redoStack.length === 0) return null;

    const entry: HistoryEntry = this.redoStack[this.redoStack.length - 1];
    this.redoStack.splice(this.redoStack.length - 1, 1);

    this.undoStack.push(HistoryEntry.create(currentState, entry.nextState, entry.commandName));
    return entry.nextState;
  }

  /** 是否可以撤销 */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 是否可以重做 */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 获取已注册命令列表 */
  getCommandNames(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.commandNames.length; i++) {
      result.push(this.commandNames[i]);
    }
    return result;
  }

  /** 清除历史 */
  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /** 设置最大历史条数 */
  setMaxHistory(max: number): void {
    this.maxHistory = max;
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.splice(0, 1);
    }
  }
}
