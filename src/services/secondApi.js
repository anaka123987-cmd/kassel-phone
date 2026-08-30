/**
 * 第二 API 调用: callSecondApiForPhoneContent
 * - generateRaw + custom_api (apiurl/key/model/source:'openai')
 * - ordered_prompts: ['user_input'], max_chat_history: 0
 * - Promise.race 超时控制 + 重试机制
 * - 解析返回结果中的 <kassel_phone>...</kassel_phone> JSON
 */

/** 默认生成提示词模板 (可在设置页「提示词」中编辑; 占位符 {{story}} {{worldbook}}) */
export const DEFAULT_PHONE_PROMPT = `【任务】你是《龙族》世界观中卡塞尔学院的校园信息系统。请根据【剧情摘要】和【世界观资料】，模拟生成学院手机终端的最新内容。

【输出格式要求】只输出一个 <kassel_phone> 标签，标签内为合法 JSON（不要输出任何其他文字、不要使用 markdown 代码块）：
<kassel_phone>
{
  "forum": { "posts": [
    { "board": "版块(校园公告|屠龙技研|灌水区|失物招领)", "title": "帖子标题", "author": "发帖人", "hue": 0-360的整数(代表头像色相), "time": "如: 刚刚/10分钟前/今天 14:30", "hot": true或false, "likes": 点赞数, "content": "帖子正文, 可用\\n换行", "replies": [ { "author": "回复人", "time": "时间", "content": "回复内容" } ] }
  ] },
  "messages": { "chats": [
    { "name": "角色名(如: 芬格尔/楚子航/诺诺/恺撒·加图索/EVA)", "isGroup": true或false(群聊时name为群名), "unread": 0或1, "messages": [ { "from": "them或me", "speaker": "发言人(群聊必填)", "text": "消息内容", "time": "时间" } ] }
  ] },
  "news": [
    { "tag": "栏目标签(头条|校园|提醒|活动)", "title": "标题", "source": "来源", "time": "时间", "content": "正文" }
  ]
}
</kassel_phone>

【要求】
1. forum.posts 给 3-6 个帖子；messages.chats 给 1-3 个会话；news 给 1-3 条资讯。
2. 内容必须贴合剧情摘要的最新进展与世界观设定，延续当前剧情氛围，可引用剧情中的事件。
3. 角色性格必须符合原著：楚子航寡言、恺撒高傲、芬格尔爱吐槽、诺诺活泼、EVA 是礼貌的校园 AI。
4. 所有文本使用中文。只输出 <kassel_phone> 标签内容本身。

【剧情摘要】
{{story}}

【世界观资料】
{{worldbook}}`;

function buildUserPrompt({ settings, storyText, worldbookText }) {
  const tpl = (settings?.promptTemplate || '').trim() || DEFAULT_PHONE_PROMPT;
  let prompt = tpl
    .replaceAll('{{story}}', storyText || '（暂无剧情，请根据世界观资料生成学院日常内容。）')
    .replaceAll('{{worldbook}}', worldbookText || '（无）');
  // 生成范围: 关闭的板块要求返回空数组
  const gen = settings?.generation || { forum: true, messages: true, news: true };
  if (!gen.forum || !gen.messages || !gen.news) {
    const scope = [
      `forum: ${gen.forum ? '生成' : '不需要, posts 返回空数组 []'}`,
      `messages: ${gen.messages ? '生成' : '不需要, chats 返回空数组 []'}`,
      `news: ${gen.news ? '生成' : '不需要, 返回空数组 []'}`,
    ].join('; ');
    prompt += `\n\n【本次生成范围】${scope}`;
  }
  return prompt;
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
 * @param {object} p
 * @param {object} p.settings 完整设置
 * @param {string} p.storyText 提取出的剧情正文
 * @param {string} p.worldbookText 拼接好的世界书条目内容
 * @param {(msg:string)=>void} p.log 调试日志函数
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
      log(`第 ${attempt}/${attempts} 次调用第二 API → ${cfg.model} @ ${cfg.url}`);
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
  const prompt = `【任务】你是《龙族》世界观中卡塞尔学院论坛BBS的模拟系统。下面是一篇帖子与玩家刚发的回帖, 请生成 1-2 条其他用户的回应 (楼主或路人, 符合龙族角色性格与学院氛围, 每条不超过50字)。
只输出: <forum_reply>[{"author":"用户名","content":"回应内容"}]</forum_reply>

【帖子】《${post.title}》(${post.board}) 作者: ${post.author}
正文: ${String(post.content || '').slice(0, 300)}
近期回复: ${(post.replies || []).slice(-3).map((r) => `${r.author}:${r.content}`).join(' / ').slice(0, 200) || '(无)'}

【玩家的回帖】${myReply}

请立即输出 <forum_reply> 内容。`;

  log(`[第二API] 论坛回帖回复请求 → ${cfg.model}`);
  const result = await withTimeout(
    window.generateRaw({
      user_input: prompt,
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
