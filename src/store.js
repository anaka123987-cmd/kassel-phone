/**
 * 全局响应式 store (Vue reactive 单例)
 */
import { reactive, computed } from 'vue';
import { loadSettings, saveSettings, loadContent, saveContent } from './services/storage.js';
import { BUILTIN_CONTENT } from './data/builtin.js';

function cloneBuiltin() {
  return JSON.parse(JSON.stringify(BUILTIN_CONTENT));
}

export const store = reactive({
  ready: false,
  /** 悬浮面板状态 */
  expanded: false,
  activeTab: 'forum',
  /** 悬浮按钮实时位置 (视口坐标), 供面板锚定展开方向 */
  fabPos: { x: 0, y: 0 },

  /** 设置 */
  settings: loadSettings(),
  /** 手机内容 */
  content: cloneBuiltin(),
  /** 内容来源: 'builtin' | 'cache' | 'second-api' | 'main-api' */
  contentSource: 'builtin',
  lastUpdated: null,

  /** 点赞记录: [`${author}|${title}`] */
  likedKeys: [],

  /** MVU 摘要 (时间/地点/好感度...) */
  mvu: null,
  personaName: null,
  chatName: 'current-chat',
  /** 最近一次提取的信息 (设置页展示字符量/估算) */
  lastExtraction: null,

  /** 第二 API 流水线状态 */
  pipeline: { running: false, lastError: null },

  /** 调试日志 (设置页展示, 上限 60 条) */
  logs: [],
  /** 轻提示 */
  toast: null,
});

/* ---------------- 工具 ---------------- */

export function log(msg) {
  const line = `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${msg}`;
  store.logs.push(line);
  if (store.logs.length > 60) store.logs.splice(0, store.logs.length - 60);
  if (store.settings.debugLog) console.log(`[卡塞尔论坛] ${line}`);
}

let toastTimer = null;
export function showToast(msg, ms = 2600) {
  store.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (store.toast = null), ms);
}

export function saveSettingsToStorage() {
  saveSettings(store.settings);
}

/* ---------------- 内容 ---------------- */

export function persistContent() {
  saveContent(store.chatName, {
    content: store.content,
    contentSource: store.contentSource,
    lastUpdated: store.lastUpdated,
    likedKeys: store.likedKeys,
  });
}

export function restoreContent(chatName) {
  const saved = loadContent(chatName);
  if (saved?.content) {
    store.content = saved.content;
    store.contentSource = saved.contentSource || 'cache';
    store.lastUpdated = saved.lastUpdated || null;
    store.likedKeys = saved.likedKeys || [];
    log(`已从缓存恢复手机内容 (聊天: ${chatName})`);
    return true;
  }
  store.content = cloneBuiltin();
  store.contentSource = 'builtin';
  store.likedKeys = [];
  return false;
}

export function postKey(post) {
  return `${post.author || ''}|${post.title || ''}`;
}

export function isPostLiked(post) {
  return store.likedKeys.includes(postKey(post));
}

export function toggleLikePost(post) {
  const key = postKey(post);
  const idx = store.likedKeys.indexOf(key);
  if (idx >= 0) {
    store.likedKeys.splice(idx, 1);
    post.likes = Math.max(0, (post.likes || 0) - 1);
  } else {
    store.likedKeys.push(key);
    post.likes = (post.likes || 0) + 1;
  }
  persistContent();
}

/* ---------------- 计算属性 ---------------- */

export const unreadTotal = computed(() => {
  const chats = store.content?.messages?.chats || [];
  return chats.reduce((sum, c) => sum + (c.unread ? 1 : 0), 0);
});

export const isMultiApi = computed(() => store.settings.apiMode === 'multi');
