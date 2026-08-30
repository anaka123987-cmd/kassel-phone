/**
 * 酒馆环境封装: 对酒馆助手全局函数做安全包装 (存在检查 + 异常捕获)
 * mock 模式下返回演示数据, 保证 demo.html 与普通浏览器预览可用
 */
import { env } from '../env.js';

const w = () => window;
export function tavernAvailable() {
  return env.inTavern;
}

/* ---------------- 楼层消息 ---------------- */

export function getCurrentMessageIdSafe() {
  try {
    if (typeof w().getCurrentMessageId === 'function') return w().getCurrentMessageId();
  } catch (e) { /* noop */ }
  return mockLastId();
}

export function getLastMessageIdSafe() {
  try {
    if (typeof w().getLastMessageId === 'function') return w().getLastMessageId();
  } catch (e) { /* noop */ }
  return mockLastId();
}

function mockLastId() {
  return MOCK_MESSAGES.length ? MOCK_MESSAGES[MOCK_MESSAGES.length - 1].message_id : 0;
}

export function getChatMessagesSafe(range, option) {
  if (env.mock) return MOCK_MESSAGES;
  try {
    if (typeof w().getChatMessages === 'function') {
      return w().getChatMessages(range, option) || [];
    }
  } catch (e) {
    console.warn('[卡塞尔论坛][楼层] getChatMessages 失败:', e);
  }
  return [];
}

export function duringGeneratingSafe() {
  try {
    if (w().TavernHelper?.builtin?.duringGenerating) return w().TavernHelper.builtin.duringGenerating();
  } catch (e) { /* noop */ }
  return false;
}

/* ---------------- 斜杠命令 ---------------- */

export async function triggerSlashSafe(command) {
  try {
    if (typeof w().triggerSlash === 'function') {
      return await w().triggerSlash(command);
    }
  } catch (e) {
    console.warn('[卡塞尔论坛][斜杠] 执行失败:', command, e);
  }
  return '';
}

let cachedChatName = null;
export async function getChatNameSafe() {
  if (cachedChatName) return cachedChatName;
  try {
    const name = await triggerSlashSafe('/getchatname');
    if (name) cachedChatName = String(name).trim();
  } catch (e) { /* noop */ }
  return cachedChatName || 'current-chat';
}

/* ---------------- 生成 ---------------- */

export async function generateRawSafe(config) {
  if (typeof w().generateRaw === 'function') {
    return await w().generateRaw(config);
  }
  throw new Error('generateRaw 不可用 (未检测到酒馆助手)');
}

/* ---------------- 世界书 ---------------- */

/**
 * 获取本卡绑定的世界书 (主世界书 + 附加世界书 + 聊天世界书)
 * @returns Promise<Array<{name: string, entries: Array<{uid, name, enabled, content}>}>>
 */
export async function getBoundWorldbooksSafe() {
  const books = [];
  const names = new Set();
  try {
    if (typeof w().getCharWorldbookNames === 'function') {
      const charBooks = w().getCharWorldbookNames('current');
      if (charBooks?.primary) names.add(charBooks.primary);
      (charBooks?.additional || []).forEach((n) => names.add(n));
    }
    if (typeof w().getChatWorldbookName === 'function') {
      const chatBook = w().getChatWorldbookName('current');
      if (chatBook) names.add(chatBook);
    }
  } catch (e) {
    console.warn('[卡塞尔论坛][世界书] 获取绑定信息失败:', e);
  }
  for (const name of names) {
    try {
      const entries = await w().getWorldbook(name);
      books.push({
        name,
        entries: (entries || []).map((en) => ({
          uid: en.uid,
          name: en.name || '(未命名条目)',
          enabled: !!en.enabled,
          content: en.content || '',
        })),
      });
    } catch (e) {
      console.warn(`[卡塞尔论坛][世界书] 读取「${name}」失败:`, e);
    }
  }
  return books;
}

/* ---------------- persona ---------------- */

export function getPersonaNameSafe() {
  try {
    if (typeof w().getCurrentPersonaName === 'function') return w().getCurrentPersonaName();
  } catch (e) { /* noop */ }
  return null;
}

/* ================= mock 实现 (demo 模式) ================= */
// mock: 论坛回帖实时回复
export async function mockGenerateForumReply(myReply) {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const pool = [
    { author: '芬格尔', content: '楼上说得对，但食堂煎蛋确实好吃。' },
    { author: '诺诺', content: '噗，这都被你发现了。' },
    { author: '匿名学员', content: '蹲一个后续。' },
  ];
  const n = 1 + Math.floor(Math.random() * 2);
  return pool.slice(0, n);
}


const MOCK_MESSAGES = [
  {
    message_id: 0,
    role: 'user',
    name: '学员',
    message: '（清晨，你收到了卡塞尔学院的录取通知书。）',
  },
  {
    message_id: 1,
    role: 'assistant',
    name: '卡塞尔学院',
    message: `<content>清晨的芝加哥郊区笼着薄雾，校车碾过落满橡果的车道。你攥着那封火漆封缄的录取通知书，抬头看见青铜校门上盘踞的龙形浮雕。
「欢迎来到卡塞尔学院。」白发苍苍的校长站在台阶顶端，风衣猎猎，「在这里，你可以做任何事——除了平庸。」
诺玛系统的提示音在你耳边轻轻响起：学籍绑定完成。</content>
<sum>新生报到；昂热校长致欢迎词；诺玛系统完成学籍绑定。</sum>
<手机消息|诺诺>师弟，欢迎来到卡塞尔！周末学生会有迎新活动，我来接你？</手机消息>`,
  },
];

const MOCK_WORLDBOOKS = [
  {
    name: '卡塞尔学院·核心设定',
    entries: [
      { uid: 0, name: '学院概况', enabled: true, content: '卡塞尔学院位于芝加哥郊区, 表面是精英私立大学, 实际是混血种屠龙组织「秘党」的最高学府。校训: 朋友圈子之外的真正的孤独。' },
      { uid: 1, name: '诺玛系统', enabled: true, content: '诺玛是学院的中枢 AI, 负责学籍管理、任务发布与校园监控, 语气礼貌而冰冷。' },
      { uid: 2, name: '狮心会', enabled: true, content: '学生会背后的精英社团, 主席恺撒·加图索, 副主席楚子航。会员是学院最锋利的刀。' },
    ],
  },
  {
    name: '当前剧情·青铜之城',
    entries: [
      { uid: 0, name: '青铜怀表', enabled: true, content: '一枚会逆走的青铜怀表, 表盖内侧刻着龙文「时间零」。似乎与图书馆三层的钟表声有关。' },
    ],
  },
];

let mockReplyCount = 0;
export async function mockGenerateRaw() {  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
  mockReplyCount += 1;
  const hot = mockReplyCount % 2 === 1;
  return `<kassel_phone>
{
  "forum": { "posts": [
    {"board": "灌水区", "title": "食堂的龙鳞煎蛋到底是什么蛋？", "author": "路明非", "hue": 210, "time": "刚刚", "hot": ${hot}, "likes": 42, "content": "听说是尼德霍格last的远亲……开玩笑的。但煎蛋真的很好吃，一天限量三份。", "replies": [{"author": "芬格尔", "time": "刚刚", "content": "帮你排到了明天的号，谢我。"}]},
    {"board": "屠龙技研", "title": "关于本学期言灵实战考核范围的通知", "author": "曼施坦因教授", "hue": 45, "time": "10分钟前", "hot": false, "likes": 88, "content": "考核范围: 言灵·镰鼬、言灵·君焰(演示)。请各位学员检查血统稳定度, 异常者先到校医院复检。", "replies": []}
  ]},
  "messages": { "chats": [
    {"name": "芬格尔", "unread": 1, "messages": [{"from": "them", "text": "师弟！诺玛说你行为积分涨了？", "time": "刚刚"}]},
    {"name": "EVA", "unread": 0, "messages": [{"from": "them", "text": "晚间提醒: 22:00 后请勿靠近地下三层。", "time": "10分钟前"}]}
  ]},
  "news": [
    {"tag": "头条", "title": "校董会特别会议召开, 议程保密", "source": "校务处", "time": "刚刚", "content": "主礼堂彻夜亮灯, 有学员称看见几位校董从直升飞机上下来。本次议程未对外公布。"}
  ]
}
</kassel_phone>`;
}
