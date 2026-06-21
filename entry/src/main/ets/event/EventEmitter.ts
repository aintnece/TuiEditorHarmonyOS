/**
 * EventEmitter — 事件总线
 *
 * 对标 tui.editor 的 event/eventEmitter.ts。
 * 支持 on / off / emit / once / emitReduce，用于解耦编辑器的各模块通信。
 * 适配 ArkTS 严格模式：用 class + 具名方法替代 Record<string, Handler[]>。
 */

export type Handler = (...args: Object[]) => void;

/** emitReduce 的 reducer 函数签名 — 对标 tui.editor 的 EmitReduceCallback */
export type EmitReducer = (source: Object, ...args: Object[]) => Object;

class HandlerList {
  handlers: Handler[] = [];

  add(handler: Handler): void {
    // 防止重复注册同一 handler（Node.js EventEmitter 行为）
    const idx: number = this.handlers.indexOf(handler);
    if (idx < 0) {
      this.handlers.push(handler);
    }
  }

  remove(handler: Handler): void {
    const idx: number = this.handlers.indexOf(handler);
    if (idx >= 0) {
      this.handlers.splice(idx, 1);
    }
  }

  /** 安全调用 — 先复制数组防止 emit 期间 handler 移除导致跳过 */
  invoke(...args: Object[]): void {
    // 快照副本，防止 splice 导致迭代跳过
    const snapshot: Handler[] = [];
    for (let i = 0; i < this.handlers.length; i++) {
      snapshot.push(this.handlers[i]);
    }
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i](...args);
    }
  }

  /** 带 reducer 的调用 — 对标 tui.editor emitReduce */
  invokeReduce(source: Object, ...args: Object[]): Object {
    // 快照副本，依次调用 handler
    const snapshot: Handler[] = [];
    for (let i = 0; i < this.handlers.length; i++) {
      snapshot.push(this.handlers[i]);
    }
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i](source, ...args);
    }
    return source;
  }

  clear(): void {
    this.handlers.length = 0;
  }

  /** 是否有监听器 */
  isEmpty(): boolean {
    return this.handlers.length === 0;
  }
}

/** 事件名常量 — 对标 tui.editor 的事件 */
export enum EditorEvent {
  Load = 'load',
  Change = 'change',
  CaretChange = 'caretChange',
  Focus = 'focus',
  Blur = 'blur',
  Keydown = 'keydown',
  Keyup = 'keyup',
  BeforePreviewRender = 'beforePreviewRender',
  BeforeConvertWysiwygToMarkdown = 'beforeConvertWysiwygToMarkdown',
  BeforeConvertMarkdownToWysiwyg = 'beforeConvertMarkdownToWysiwyg',
  LoadUI = 'loadUI',
  StateChange = 'stateChange',
  Destroy = 'destroy',
}

export class EventEmitter {
  private events: HandlerList[] = [];
  private eventNames: string[] = [];

  private getOrCreateIndex(eventName: string): number {
    for (let i = 0; i < this.eventNames.length; i++) {
      if (this.eventNames[i] === eventName) return i;
    }
    this.eventNames.push(eventName);
    this.events.push(new HandlerList());
    return this.eventNames.length - 1;
  }

  private findIndex(eventName: string): number {
    for (let i = 0; i < this.eventNames.length; i++) {
      if (this.eventNames[i] === eventName) return i;
    }
    return -1;
  }

  /** 监听事件 */
  on(eventName: string, handler: Handler): void {
    const idx: number = this.getOrCreateIndex(eventName);
    this.events[idx].add(handler);
  }

  /** 移除监听 */
  off(eventName: string, handler: Handler): void {
    const idx: number = this.findIndex(eventName);
    if (idx >= 0) {
      this.events[idx].remove(handler);
    }
  }

  /** 触发事件 */
  emit(eventName: string, ...args: Object[]): void {
    const idx: number = this.findIndex(eventName);
    if (idx >= 0) {
      this.events[idx].invoke(...args);
    }
  }

  /**
   * 带 reducer 的事件触发 — 对标 tui.editor 的 emitReduce()。
   * 每个监听器接收上一个监听器的返回值作为输入，类似中间件管道。
   * 用于内容转换钩子（BeforeConvertWysiwygToMarkdown 等）。
   */
  emitReduce(eventName: string, source: Object, ...args: Object[]): Object {
    const idx: number = this.findIndex(eventName);
    if (idx >= 0) {
      return this.events[idx].invokeReduce(source, ...args);
    }
    return source;
  }

  /** 监听一次 */
  once(eventName: string, handler: Handler): void {
    const self: EventEmitter = this;
    const onceHandler: Handler = (...args: Object[]): void => {
      self.off(eventName, onceHandler);
      handler(...args);
    };
    this.on(eventName, onceHandler);
  }

  /** 是否有指定事件的监听器 */
  hasListener(eventName: string): boolean {
    const idx: number = this.findIndex(eventName);
    if (idx >= 0) {
      return !this.events[idx].isEmpty();
    }
    return false;
  }

  /** 获取所有已注册的事件名（对标 tui.editor getEvents()） */
  getEvents(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.eventNames.length; i++) {
      result.push(this.eventNames[i]);
    }
    return result;
  }

  /** 移除某事件的所有监听器 */
  removeAllListeners(eventName: string): void {
    const idx: number = this.findIndex(eventName);
    if (idx >= 0) {
      this.events[idx].clear();
    }
  }

  /** 清除所有监听 */
  clear(): void {
    for (let i = 0; i < this.events.length; i++) {
      this.events[i].clear();
    }
    this.eventNames.length = 0;
    this.events.length = 0;
  }
}
