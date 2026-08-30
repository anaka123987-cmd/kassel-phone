/**
 * 剧情消息解析引擎 (剧情 → 手机)
 *
 * AI 在正常回复中按以下格式输出, 本模块轮询解析并同步进手机私信:
 *   私信: <手机消息|芬格尔>师弟, 睡了吗?</手机消息>
 *   群聊: <群消息|狮心会|恺撒>明早五点半训练</群消息>
 * 只解析「启动之后新增的楼层」, 避免历史楼层重复导入 (demo 模式解析内置楼层以供演示)
 */
import { store, log, showToast, persistContent } from '../store.js';
import { getChatMessagesSafe, getLastMessageIdSafe } from './tavern.js';
import { env } from '../env.js';

const PRIV_RE = /<手机消息\s*\|([^>|]+)>([\s\S]*?)<\/手机消息>/g;
const GROUP_RE = /<群消息\s*\|([^>|]+)\s*\|\s*([^>|]+)>([\s\S]*?)<\/群消息>/g;

/** 已解析到的楼层号 (只向前解析) */
let lastParsedId = -1;

function hueFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

/** 初始化解析游标: 酒馆内从当前最新楼层开始 (不导入历史); demo 模式解析内置楼层 */
export function initSyncPointer() {
  if (env.mock) {
    lastParsedId = -1;
  } else {
    lastParsedId = getLastMessageIdSafe();
  }
  log(`[同步] 消息解析游标初始化到第 ${lastParsedId} 楼`);
}

function findOrCreateChat(name, isGroup) {
  const chats = store.content.messages.chats;
  const key = isGroup ? `群:${name}` : name;
  let chat = chats.find((c) => (isGroup ? c.name === name && c.isGroup : c.name === name && !c.isGroup));
  if (!chat) {
    chat = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      isGroup: !!isGroup,
      role: isGroup ? '群聊' : '同学',
      hue: hueFor(name),
      unread: 0,
      quickReplies: isGroup ? ['收到', '知道了', '好的'] : ['我在', '怎么了?', '好的'],
      messages: [],
    };
    chats.push(chat);
  }
  return chat;
}

function pushMessage(chat, msg) {
  chat.messages = chat.messages || [];
  // 去重: 同一会话中相同 发言人+内容+楼层的消息不重复入 (按 key 记录在消息上)
  chat.messages.push(msg);
  chat.unread = (chat.unread || 0) + 1;
}

/**
 * 扫描 (lastParsedId, lastId] 范围内的 AI 楼层, 解析手机消息标签
 * @returns {number} 本次解析到的消息条数
 */
export function ingestFloorMessages() {
  if (store.chatName === '__demo_noop__') return 0;
  const lastId = getLastMessageIdSafe();
  if (lastId <= lastParsedId) return 0;
  const begin = lastParsedId + 1;
  const messages = getChatMessagesSafe(`${begin}-${lastId}`);
  let count = 0;

  for (const floor of messages) {
    if (floor.role !== 'assistant' || !floor.message) continue;
    const text = floor.message;
    const events = [];

    let m;
    PRIV_RE.lastIndex = 0;
    while ((m = PRIV_RE.exec(text)) !== null) {
      events.push({ chatName: m[1].trim(), isGroup: false, speaker: m[1].trim(), body: m[2].trim() });
    }
    GROUP_RE.lastIndex = 0;
    while ((m = GROUP_RE.exec(text)) !== null) {
      events.push({ chatName: m[1].trim(), isGroup: true, speaker: m[2].trim(), body: m[3].trim() });
    }

    for (const ev of events) {
      if (!ev.chatName || !ev.body) continue;
      const chat = findOrCreateChat(ev.chatName, ev.isGroup);
      pushMessage(chat, {
        from: 'them',
        speaker: ev.isGroup ? ev.speaker : undefined,
        text: ev.body.slice(0, 500),
        time: nowTime(),
        fromFloor: floor.message_id,
      });
      count += 1;
      log(`[同步] 第${floor.message_id}楼: ${ev.isGroup ? '群' : '私信'} ${ev.chatName}${ev.isGroup ? '@' + ev.speaker : ''} → ${ev.body.slice(0, 30)}`);
    }
  }

  if (count > 0) {
    persistContent();
    showToast(`收到 ${count} 条手机消息`);
  }
  lastParsedId = lastId;
  return count;
}

/** 导出给设置页做格式校验/说明 */
export const SYNC_FORMAT_DOC = `私信: <手机消息|角色名>消息内容</手机消息>
群聊: <群消息|群名|发言人>消息内容</群消息>`;
