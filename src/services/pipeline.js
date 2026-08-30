/**
 * 多 API 流程编排 (对应需求规格 3~7 条)
 *
 * 主 API 剧情由酒馆本体完成; 本模块负责:
 * 1. 提取楼层正文 (extractor 规则)
 * 2. 读取勾选的世界书条目
 * 3. callSecondApiForPhoneContent (第二 API, generateRaw + custom_api)
 * 4. 失败降级: 主 API (generateRaw, 无 custom_api) → 维持现有内容
 * 5. 结果合并进 store 并持久化
 * 6. 全程调试日志区分 [提取]/[世界书]/[第二API]/[主API]
 */
import { store, log, showToast, persistContent } from '../store.js';
import { getChatMessagesSafe, getLastMessageIdSafe, generateRawSafe, getBoundWorldbooksSafe, getChatNameSafe, mockGenerateRaw, tavernAvailable } from './tavern.js';
import { extractFloorsForPrompt } from './extractor.js';
import { callSecondApiForPhoneContent, parsePhonePayload, buildUserPrompt } from './secondApi.js';

/** 从设置的选择表中拼出世界书文本 */
export async function collectWorldbookText() {
  const selection = store.settings.worldbookSelection || {};
  const bookNames = Object.keys(selection).filter((b) => (selection[b] || []).length > 0);
  if (!bookNames.length) {
    log('[世界书] 未勾选任何条目, 跳过世界书注入');
    return '';
  }
  const books = await getBoundWorldbooksSafe();
  const parts = [];
  for (const book of books) {
    if (!bookNames.includes(book.name)) continue;
    const picked = book.entries.filter((en) => selection[book.name].includes(en.uid));
    for (const en of picked) {
      parts.push(`【${book.name} · ${en.name}】\n${en.content}`);
    }
  }
  const text = parts.join('\n\n');
  log(`[世界书] 注入 ${parts.length} 个条目, 共 ${text.length} 字`);
  return text;
}

/** 提取最近 N 楼的正文 */
export function collectStoryText() {
  const floors = Math.max(1, Number(store.settings.extraction.floors) || 6);
  const last = getLastMessageIdSafe();
  if (last < 0) return '';
  const begin = Math.max(0, last - floors + 1);
  const messages = getChatMessagesSafe(`${begin}-${last}`);
  const story = extractFloorsForPrompt(store.settings, messages);
  log(`[提取] 第${begin}-${last}楼 → ${story.length} 字 (标签:${store.settings.extraction.tag}${store.settings.extraction.extraTag ? ` + 附加:${store.settings.extraction.extraTag}` : ''}, 含用户消息:${store.settings.extraction.includeUser ? '是' : '否'})`);
  return story;
}

/** 合并第二 API 生成内容到 store.content */
export function mergePhonePayload(payload) {
  const c = store.content;

  if (payload?.forum?.posts?.length) {
    const existing = new Set(c.forum.posts.map((p) => `${p.author}|${p.title}`));
    const fresh = payload.forum.posts
      .filter((p) => p && p.title)
      .map((p, i) => ({
        id: `ai-${Date.now()}-${i}`,
        board: p.board || '灌水区',
        title: String(p.title),
        author: p.author || '匿名学员',
        hue: Number(p.hue) || 200,
        time: p.time || '刚刚',
        pinned: false,
        hot: !!p.hot,
        likes: Number(p.likes) || 0,
        content: String(p.content || ''),
        replies: Array.isArray(p.replies)
          ? p.replies.filter((r) => r && r.content).map((r, j) => ({
              author: r.author || '匿名',
              time: r.time || '',
              content: String(r.content),
              _k: `r-${Date.now()}-${i}-${j}`,
            }))
          : [],
        fresh: true,
      }))
      .filter((p) => {
        if (existing.has(`${p.author}|${p.title}`)) return false;
        existing.add(`${p.author}|${p.title}`);
        return true;
      });
    c.forum.posts = [...fresh, ...c.forum.posts].slice(0, 24);
  }

  if (payload?.messages?.chats?.length) {
    for (const chat of payload.messages.chats) {
      if (!chat?.name) continue;
      const target = c.messages.chats.find((x) => x.name === chat.name);
      const msgs = (chat.messages || [])
        .filter((m) => m && m.text)
        .map((m, i) => ({ from: m.from === 'me' ? 'me' : 'them', text: String(m.text), time: m.time || '', _k: `m-${Date.now()}-${i}` }));
      if (target) {
        if (msgs.length) target.messages = msgs;
        if (typeof chat.unread === 'number') target.unread = chat.unread;
      } else {
        c.messages.chats.push({
          id: `ai-${Date.now()}-${chat.name}`,
          name: chat.name,
          role: '同学',
          hue: 200,
          unread: Number(chat.unread) || 0,
          quickReplies: ['我在', '知道了', '回头聊'],
          messages: msgs,
        });
      }
    }
  }

  if (payload?.news?.length) {
    const existingTitles = new Set(c.news.map((n) => n.title));
    const fresh = payload.news
      .filter((n) => n && n.title && !existingTitles.has(n.title))
      .map((n, i) => ({
        id: `ai-news-${Date.now()}-${i}`,
        tag: n.tag || '校园',
        title: String(n.title),
        source: n.source || '校务处',
        time: n.time || '刚刚',
        content: String(n.content || ''),
        fresh: true,
      }));
    c.news = [...fresh, ...c.news].slice(0, 12);
  }
}

async function callWithFallback(storyText, worldbookText) {
  const { settings } = store;
  const logFn = (m) => log(`[第二API] ${m}`);

  if (settings.apiMode !== 'multi') {
    store.pipeline.lastError = null;
    return false;
  }

  if (!tavernAvailable()) {
    // demo 模式: 用 mock 生成器走完整解析链路
    log('[第二API] 非酒馆环境, 使用 mock 生成器演示流程');
    try {
      const raw = await mockGenerateRaw();
      const payload = parsePhonePayload(raw);
      mergePhonePayload(payload);
      store.contentSource = 'second-api';
      store.lastUpdated = Date.now();
      store.pipeline.lastError = null;
      persistContent();
      log('[第二API] mock 生成完成 (demo 模式)');
      showToast('已生成新内容 (演示模式)');
      return true;
    } catch (e) {
      log(`[第二API] mock 生成失败: ${e?.message || e}`);
      return false;
    }
  }

  try {
    const payload = await callSecondApiForPhoneContent({ settings, storyText, worldbookText, log: logFn });
    mergePhonePayload(payload);
    store.contentSource = 'second-api';
    store.lastUpdated = Date.now();
    store.pipeline.lastError = null;
    persistContent();
    return true;
  } catch (secondErr) {
    log(`[第二API] 最终失败: ${secondErr?.message || secondErr}`);

    if (settings.fallbackMainApi) {
      log('[主API] 尝试降级为酒馆主 API 生成...');
      try {
        const raw = await generateRawSafe({
          user_input: buildFallbackPrompt(storyText, worldbookText),
          max_chat_history: 0,
        });
        const payload = parsePhonePayload(raw);
        mergePhonePayload(payload);
        store.contentSource = 'main-api';
        store.lastUpdated = Date.now();
        store.pipeline.lastError = null;
        persistContent();
        log('[主API] 降级生成成功');
        showToast('第二 API 失败, 已用主 API 生成');
        return true;
      } catch (mainErr) {
        log(`[主API] 降级生成也失败: ${mainErr?.message || mainErr}`);
        store.pipeline.lastError = `第二API: ${secondErr?.message || secondErr} / 主API: ${mainErr?.message || mainErr}`;
        showToast('生成失败, 已保留现有内容');
        return false;
      }
    }

    store.pipeline.lastError = String(secondErr?.message || secondErr);
    showToast('第二 API 调用失败, 已保留现有内容');
    return false;
  }
}

function buildFallbackPrompt(storyText, worldbookText) {
  // 降级时复用与第二 API 相同的提示词结构
  return buildUserPrompt({ storyText, worldbookText });
}

/**
 * 刷新手机内容总入口
 * @param {string} reason 触发原因 (日志用)
 */
export async function refreshPhoneContent(reason = '手动') {
  if (store.pipeline.running) {
    log(`[流水线] 已有任务进行中, 忽略本次触发 (${reason})`);
    return false;
  }
  if (store.settings.apiMode !== 'multi') {
    log(`[流水线] 当前为单 API 模式, 跳过刷新 (${reason})`);
    return false;
  }

  store.pipeline.running = true;
  log(`[流水线] 开始刷新手机内容 (触发: ${reason})`);
  try {
    const storyText = collectStoryText();
    const worldbookText = await collectWorldbookText();
    const ok = await callWithFallback(storyText, worldbookText);
    log(`[流水线] 刷新结束, 结果: ${ok ? '成功' : '失败/跳过'}`);
    return ok;
  } catch (e) {
    log(`[流水线] 异常: ${e?.message || e}`);
    store.pipeline.lastError = String(e?.message || e);
    return false;
  } finally {
    store.pipeline.running = false;
  }
}

export async function ensureChatName() {
  store.chatName = await getChatNameSafe();
  return store.chatName;
}
