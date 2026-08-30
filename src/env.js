/**
 * 运行环境探测
 *
 * - 酒馆助手「脚本」模式下: 代码运行在酒馆注入的 iframe 中,
 *   酒馆助手全局函数 (getChatMessages / generateRaw ...) 直接可用,
 *   UI 应注入到 window.parent.document (同源) 以实现全页悬浮。
 * - 普通 demo/预览模式: 直接运行在页面上, 使用内置 mock 数据。
 */

function tryGetParentDoc() {
  try {
    if (window.parent && window.parent.document && window.parent.document !== document) {
      // 触发一次访问确认无跨域异常
      void window.parent.document.body;
      return window.parent.document;
    }
  } catch (e) {
    /* 跨域不可访问, 回退当前文档 */
  }
  return null;
}

function detectTavernGlobals() {
  const w = window;
  return (
    typeof w.getChatMessages === 'function' &&
    typeof w.getCurrentMessageId === 'function'
  );
}

export const env = {
  /** 是否处于酒馆助手环境 (存在酒馆助手全局函数) */
  inTavern: false,
  /** mock 模式: 无酒馆环境, 使用内置演示数据 */
  mock: false,
  /** UI 注入目标 document */
  doc: null,
  /** 注入目标 window */
  win: null,
  detect() {
    this.inTavern = detectTavernGlobals();
    const pdoc = tryGetParentDoc();
    // 酒馆脚本 iframe 中注入宿主页; 否则 (demo / 前端界面) 注入当前文档
    this.doc = this.inTavern && pdoc ? pdoc : document;
    this.win = this.doc === document ? window : window.parent;
    this.mock = !this.inTavern;
    return this;
  },
};

/** 当前注入容器所在文档的 window (用于监听 resize 等) */
export function hostWindow() {
  return env.win || window;
}

export function hostDocument() {
  return env.doc || document;
}
