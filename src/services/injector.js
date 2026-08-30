/**
 * 注入引擎 (手机 → 剧情)
 *
 * 1. 常驻注入: 手机状态摘要 (热帖/未读私信/资讯) + 消息格式规范
 *    → injectPrompts(system, 深度可配), 内容每次刷新后自动重注入
 * 2. 回复注入: 玩家在手机里回私信/群聊 → injectPrompts(once:true, 深度0)
 *    下一次生成时 AI 在最新楼层看到回复内容
 * 3. 一键安装显示过滤正则: 酒馆显示时隐藏 <手机消息>/<群消息> 标签 (提示词中保留)
 */
import { store, log, showToast } from '../store.js';
import { tavernAvailable } from './tavern.js';
import { DEFAULT_PROMPTS } from './prompts.js';

export const INJECT_ID = 'kassel-phone-digest';
const REPLY_ID = 'kassel-phone-reply';

/** 生效提示词: 用户编辑值优先, 缺省回落默认 */
function effectivePrompt(key) {
  const v = store.settings.prompts?.[key];
  return v == null || v === '' ? DEFAULT_PROMPTS[key] : v;
}

export function buildDigest() {
  const c = store.content;
  const parts = [];
  if (store.mvu?.datetime) parts.push(`时间:${store.mvu.datetime}`);
  if (store.mvu?.location) parts.push(`地点:${store.mvu.location}`);
  const posts = c.forum?.posts || [];
  const titles = posts.slice(0, 3).map((p) => `《${p.title}》`).join('');
  if (titles) {
    parts.push(`论坛热帖:${titles}`);
    if (posts[0]?.content) parts.push(`热帖摘要:「${String(posts[0].content).replace(/\s+/g, ' ').slice(0, 40)}」`);
  }
  const unread = (c.messages?.chats || [])
    .filter((ch) => ch.unread)
    .slice(0, 4)
    .map((ch) => `${ch.name}:"${(ch.messages?.[ch.messages.length - 1]?.text || '').slice(0, 24)}"`)
    .join(' ');
  if (unread) parts.push(`手机未读:${unread}`);
  const news = (c.news || []).slice(0, 2).map((n) => `《${n.title}》`).join('');
  if (news) parts.push(`校园资讯:${news}`);

  // 摘要模板可编辑 (占位符: {{time}} {{location}} {{posts}} {{postPreview}} {{unread}} {{news}} {{info}})
  const tpl = effectivePrompt('digest');
  const text = tpl
    .replaceAll('{{time}}', store.mvu?.datetime || '')
    .replaceAll('{{location}}', store.mvu?.location || '')
    .replaceAll('{{posts}}', titles)
    .replaceAll('{{postPreview}}', posts[0]?.content ? String(posts[0].content).replace(/\s+/g, ' ').slice(0, 40) : '')
    .replaceAll('{{unread}}', unread)
    .replaceAll('{{news}}', news)
    .replaceAll('{{info}}', parts.join(' | '));
  return text;
}

/** 常驻注入: 摘要模板 + 消息格式规范 (均可编辑) */
export function syncPhoneInjection() {
  if (!tavernAvailable() || typeof window.injectPrompts !== 'function') return false;
  if (!store.settings.sync?.injectEnabled) {
    removePhoneInjection();
    return false;
  }
  const content = `${buildDigest()}\n${effectivePrompt('formatSpec')}`;
  try {
    window.injectPrompts(
      [
        {
          id: INJECT_ID,
          position: 'in_chat',
          depth: Math.max(0, Number(store.settings.sync?.injectDepth) || 4),
          role: 'system',
          content,
        },
      ],
      { once: false },
    );
    log(`[注入] 手机摘要已注入 (深度 ${store.settings.sync?.injectDepth}, ${content.length} 字)`);
    return true;
  } catch (e) {
    log(`[注入] 注入失败: ${e?.message || e}`);
    return false;
  }
}

export function removePhoneInjection() {
  try {
    if (typeof window.uninjectPrompts === 'function') window.uninjectPrompts([INJECT_ID]);
  } catch (e) { /* noop */ }
}

/**
 * 手机回复注入: 玩家在手机里回私信/群聊, 下一次生成时 AI 在最新楼层看到
 * @param {{name:string, isGroup?:boolean}} chat
 * @param {string} text
 * @returns {Promise<boolean>} 是否走注入通道
 */
export async function sendPhoneReply(chat, text) {
  const useInject = store.settings.sync?.replyInject !== false;
  if (useInject && tavernAvailable() && typeof window.injectPrompts === 'function') {
    const action = chat.isGroup ? `在群聊「${chat.name}」中发言` : `回复「${chat.name}」`;
    // 回复模板可编辑 (占位符: {{action}} {{chat}} {{text}})
    const content = effectivePrompt('reply')
      .replaceAll('{{action}}', action)
      .replaceAll('{{chat}}', chat.name)
      .replaceAll('{{text}}', text);
    try {
      window.injectPrompts(
        [
          {
            id: REPLY_ID,
            position: 'in_chat',
            depth: 0,
            role: 'system',
            content,
          },
        ],
        { once: true },
      );
      log(`[注入] 手机回复已注入(下一次生成生效): ${action} "${text.slice(0, 30)}"`);
      if (store.settings.sync?.autoTrigger) {
        try {
          if (typeof window.triggerSlash === 'function') await window.triggerSlash('/trigger');
        } catch (e) { /* noop */ }
      }
      return true;
    } catch (e) {
      log(`[注入] 回复注入失败: ${e?.message || e}`);
      return false;
    }
  }
  return false;
}

/** 一键安装显示过滤正则: 显示时隐藏手机消息标签, 提示词中保留 */
export async function installDisplayRegex() {
  if (!tavernAvailable() || typeof window.importRawTavernRegex !== 'function') {
    showToast('演示模式: 该功能需在酒馆内使用');
    return false;
  }
  const regexJson = JSON.stringify({
    id: 'kassel-phone-filter',
    script_name: '卡塞尔手机·过滤手机消息标签(显示)',
    enabled: true,
    find_regex: '<手机消息\\s*\\|[^>]*>[\\s\\S]*?<\\/手机消息>|<群消息\\s*\\|[^>]*>[\\s\\S]*?<\\/群消息>',
    replace_string: '',
    trim_strings: [],
    source: { user_input: false, ai_output: true, slash_command: false, world_info: false, reasoning: false },
    destination: { display: true, prompt: false },
    run_on_edit: true,
    min_depth: null,
    max_depth: null,
  });
  try {
    const ok = window.importRawTavernRegex('卡塞尔手机·过滤手机消息标签', regexJson);
    log(`[注入] 显示过滤正则安装: ${ok ? '成功' : '失败'}`);
    showToast(ok ? '过滤正则已安装, 标签在酒馆显示时自动隐藏' : '安装失败, 详见控制台');
    return !!ok;
  } catch (e) {
    log(`[注入] 正则安装异常: ${e?.message || e}`);
    showToast('安装异常, 详见控制台');
    return false;
  }
}
