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

export const INJECT_ID = 'kassel-phone-digest';
const REPLY_ID = 'kassel-phone-reply';

export const FORMAT_SPEC = `【校园手机消息格式】当剧情中需要某角色给玩家的校园手机发私信时, 在回复正文末尾按此格式输出(会被前端解析为手机私信): <手机消息|角色名>消息内容</手机消息> ; 群聊消息: <群消息|群名|发言人>消息内容</群消息> 。一条回复中可输出多条, 内容要符合角色性格与当前剧情。`;

export function buildDigest() {
  const c = store.content;
  const parts = [];
  if (store.mvu?.datetime) parts.push(`时间:${store.mvu.datetime}`);
  if (store.mvu?.location) parts.push(`地点:${store.mvu.location}`);
  const posts = (c.forum?.posts || []).slice(0, 3).map((p) => `《${p.title}》`).join('');
  if (posts) parts.push(`论坛热帖:${posts}`);
  const unread = (c.messages?.chats || [])
    .filter((ch) => ch.unread)
    .slice(0, 4)
    .map((ch) => `${ch.name}:"${(ch.messages?.[ch.messages.length - 1]?.text || '').slice(0, 24)}"`)
    .join(' ');
  if (unread) parts.push(`手机未读:${unread}`);
  const news = (c.news || []).slice(0, 2).map((n) => `《${n.title}》`).join('');
  if (news) parts.push(`校园资讯:${news}`);
  return `[校园手机同步] 玩家的卡塞尔学院手机当前状态 → ${parts.join(' | ')}`;
}

/** 常驻注入手机摘要 + 格式规范; 返回是否成功 */
export function syncPhoneInjection() {
  if (!tavernAvailable() || typeof window.injectPrompts !== 'function') return false;
  if (!store.settings.sync?.injectEnabled) {
    removePhoneInjection();
    return false;
  }
  const content = `${buildDigest()}\n${FORMAT_SPEC}`;
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
    const label = chat.isGroup ? `在群聊「${chat.name}」中发言` : `通过手机回复「${chat.name}」`;
    try {
      window.injectPrompts(
        [
          {
            id: REPLY_ID,
            position: 'in_chat',
            depth: 0,
            role: 'system',
            content: `[玩家通过校园手机${label}："${text}"]`,
          },
        ],
        { once: true },
      );
      log(`[注入] 手机回复已注入(下一次生成生效): ${label} "${text.slice(0, 30)}"`);
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
