/**
 * localStorage 持久化: 设置 + 手机内容缓存
 * 设置键: kassel_phone_settings
 * 内容键: kassel_phone_content_<聊天文件名>
 */
import { DEFAULT_PROMPTS } from './prompts.js';

const SETTINGS_KEY = 'kassel_phone_settings';

export const DEFAULT_SETTINGS = {
  /** 'single' | 'multi' —— API 模式开关 */
  apiMode: 'single',
  /** 第二 API 配置 */
  secondApi: {
    url: '',
    key: '',
    model: '',
    timeout: 30000,
    retries: 3,
  },
  /** 失败时是否降级为酒馆主 API (不填 custom_api, 走当前源) */
  fallbackMainApi: true,
  /** 论坛生成模式: 'replace' 全量替换 | 'append' 追加合并 */
  forumMode: 'replace',
  /** 生成范围开关 (第二 API 生成哪些板块) */
  generation: { forum: true, messages: true, news: true },
  /** 论坛回帖实时回复 (第二 API 生成路人/楼主回应) */
  forumLiveReply: true,
  /** 剧情同步 (手机 ↔ 对话) */
  sync: {
    /** 手机状态摘要 + 消息格式 常驻注入提示词 */
    injectEnabled: true,
    /** 注入深度 */
    injectDepth: 4,
    /** 手机回复注入最新楼层 (下一次生成生效, once) */
    replyInject: true,
    /** 发送后自动触发 AI 回复 (/trigger) */
    autoTrigger: false,
  },
  /** 外观 */
  accent: 'bronze',
  customCss: '',
  /** 提示词中心 (全部完整可编辑, 默认值即完整文案) */
  prompts: { ...DEFAULT_PROMPTS },
  /** 世界书最大注入字符数 (0 = 不限) */
  worldbookMaxChars: 2000,
  /** 楼层正文提取规则 */
  extraction: {
    /** 主提取标签, 如 content: 只提取 <content>...</content> 内的正文 */
    tag: 'content',
    /** 附加提取标签, 如 sum: 在正文外额外提取 <sum>...</sum>, 留空则不附加 */
    extraTag: 'sum',
    /** 剔除提取内容中的 HTML 注释 <!-- --> */
    excludeHtmlComments: true,
    /** 排除块头部文本 (每个提取块开头出现的该文本会被剔除) */
    excludeHead: '',
    /** 排除块尾部文本 */
    excludeTail: '',
    /** 是否包含用户消息 (用户楼层直接发送全部消息, 不做标签提取) */
    includeUser: false,
    /** 提取最近多少楼 */
    floors: 6,
    /** 单楼提取字符上限 (0 = 不限) */
    maxCharsPerFloor: 500,
  },
  /** 世界书条目选择: { 世界书名: [uid, ...] } */
  worldbookSelection: {},
  /** 是否输出调试日志 */
  debugLog: true,
  /** 悬浮按钮位置 { x, y } (视口像素坐标) */
  buttonPos: null,
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 深合并 defaults <- saved (数组/原始值直接覆盖) */
function deepMerge(base, patch) {
  const out = { ...base };
  for (const k of Object.keys(patch || {})) {
    const pv = patch[k];
    const bv = base?.[k];
    if (isPlainObject(bv) && isPlainObject(pv)) out[k] = deepMerge(bv, pv);
    else if (pv !== undefined) out[k] = pv;
  }
  return out;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    return deepMerge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) {
    console.warn('[卡塞尔论坛][存储] 设置读取失败, 使用默认值:', e);
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[卡塞尔论坛][存储] 设置保存失败:', e);
  }
}

export function contentKey(chatName) {
  return `kassel_phone_content_${chatName || 'default'}`;
}

export function loadContent(chatName) {
  try {
    const raw = localStorage.getItem(contentKey(chatName));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveContent(chatName, content) {
  try {
    localStorage.setItem(contentKey(chatName), JSON.stringify(content));
  } catch (e) {
    console.warn('[卡塞尔论坛][存储] 内容保存失败:', e);
  }
}
