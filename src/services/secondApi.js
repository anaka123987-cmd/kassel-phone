/**
 * 第二 API 调用: callSecondApiForPhoneContent
 * - generateRaw + custom_api (apiurl/key/model/source:'openai')
 * - ordered_prompts: ['user_input'], max_chat_history: 0
 * - Promise.race 超时控制 + 重试机制
 * - 解析返回结果中的 <kassel_phone>...</kassel_phone> JSON
 *
 * 提示词组装 (全部可编辑部分来自 settings.prompts, 默认文案见 prompts.js):
 *   前置文本(破限/风格) → 公共设定 → 各启用板块要求 → 固定输出格式 → 剧情摘要 → 世界书
 */
import { DEFAULT_PROMPTS, OUTPUT_FORMAT_FIXED, FORUM_REPLY_FORMAT_FIXED } from './prompts.js';

export { DEFAULT_PROMPTS };

function buildUserPrompt({ settings, storyText, worldbookText }) {
  const P = { ...DEFAULT_PROMPTS, ...(settings?.prompts || {}) };
  const gen = settings?.generation || { forum: true, messages: true, news: true };
  const blocks = [];

  if (P.preset?.trim()) blocks.push(P.preset.trim());
  blocks.push(P.base);

  const enabled = [];
  if (gen.forum) { enabled.push('论坛'); blocks.push(`【论坛板块要求】\n${P.forum}`); }
  if (gen.messages) { enabled.push('私信'); blocks.push(`【私信板块要求】\n${P.messages}`); }
  if (gen.news) { enabled.push('资讯'); blocks.push(`【资讯板块要求】\n${P.news}`); }
  if (enabled.length < 3) {
    blocks.push(`【本次生成范围】只生成: ${enabled.join('、')}。未启用的板块在对应字段返回空数组 (posts / chats / news 为 [])。`);
  }

  blocks.push(OUTPUT_FORMAT_FIXED);
  blocks.push(`【剧情摘要】\n${storyText || '（暂无剧情，请根据世界观资料生成学院日常内容。）'}`);
  blocks.push(`【世界观资料】\n${worldbookText || '（无）'}`);
  blocks.push('请立即输出 <kassel_phone> 内容。');

  return blocks.join('\n\n');
}

function parsePhonePayload(text) {
  if (!text) throw new Error('第二 API 返回为空');
  const m = text.match(/<kassel_phone>([\s\S]*?)<\/kassel_phone>/i);
  const body = (m ? m[1] : text).trim();
  // 去掉可能的 markdown 代码围栏
  const cleaned = body.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('第二 API 返回中未找到 JSON');
  const json = JSON.parse(cleaned.slice(start, end + 1));
  return json;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 超时 (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * 调用第二 API 生成手机内容
 * @returns {Promise<object>} 解析后的 JSON
 */
export async function callSecondApiForPhoneContent({ settings, storyText, worldbookText, log }) {
  const cfg = settings.secondApi;
  if (!cfg.url || !cfg.model) {
    throw new Error('第二 API 配置不完整 (缺少 URL 或模型名)');
  }

  const userPrompt = buildUserPrompt({ settings, storyText, worldbookText });
  const attempts = Math.max(1, (cfg.retries ?? 3) + 1);
  const timeoutMs = Number(cfg.timeout) > 0 ? Number(cfg.timeout) : 30000;

  let lastErr = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      log(`第 ${attempt}/${attempts} 次调用第二 API → ${cfg.model} @ ${cfg.url} (提示词 ${userPrompt.length} 字)`);
      const result = await withTimeout(
        window.generateRaw({
          user_input: userPrompt,
          custom_api: {
            apiurl: cfg.url,
            key: cfg.key || '',
            model: cfg.model,
            source: 'openai',
          },
          ordered_prompts: ['user_input'],
          max_chat_history: 0,
        }),
        timeoutMs,
        '第二 API',
      );
      const payload = parsePhonePayload(result);
      log('第二 API 调用成功, 内容解析完成');
      return payload;
    } catch (err) {
      lastErr = err;
      log(`第二 API 第 ${attempt} 次调用失败: ${err?.message || err}`);
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr || new Error('第二 API 调用失败');
}

export { parsePhonePayload, buildUserPrompt };

/**
 * 论坛回帖实时回复: 轻量请求, 生成 1-3 条其他用户的回应
 * @returns {Promise<Array<{author:string, content:string}>>}
 */
export async function callSecondApiForForumReply({ settings, post, myReply, log }) {
  const cfg = settings.secondApi;
  if (!cfg.url || !cfg.model) throw new Error('第二 API 未配置');

  const P = { ...DEFAULT_PROMPTS, ...(settings.prompts || {}) };
  const blocks = [];
  if (P.preset?.trim()) blocks.push(P.preset.trim());
  blocks.push(P.forumReply);
  blocks.push(FORUM_REPLY_FORMAT_FIXED);
  blocks.push(`【帖子】《${post.title}》(${post.board}) 作者: ${post.author}
正文: ${String(post.content || '').slice(0, 300)}
近期回复: ${(post.replies || []).slice(-3).map((r) => `${r.author}:${r.content}`).join(' / ').slice(0, 200) || '(无)'}`);
  blocks.push(`【玩家的回帖】${myReply}`);
  blocks.push('请立即输出 <forum_reply> 内容。');
  const userPrompt = blocks.join('\n\n');

  log(`[第二API] 论坛回帖回复请求 → ${cfg.model} (提示词 ${userPrompt.length} 字)`);
  const result = await withTimeout(
    window.generateRaw({
      user_input: userPrompt,
      custom_api: { apiurl: cfg.url, key: cfg.key || '', model: cfg.model, source: 'openai' },
      ordered_prompts: ['user_input'],
      max_chat_history: 0,
    }),
    20000,
    '论坛回复',
  );
  const text = String(result);
  const m = text.match(/<forum_reply>([\s\S]*?)<\/forum_reply>/i);
  const arr = JSON.parse((m ? m[1] : text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
  if (!Array.isArray(arr)) throw new Error('回复格式错误');
  return arr
    .filter((r) => r && r.content)
    .slice(0, 3)
    .map((r) => ({ author: String(r.author || '匿名学员'), content: String(r.content) }));
}
