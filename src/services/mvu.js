/**
 * MVU 变量联动 (需要安装 MVU 变量框架脚本)
 * 读取 stat_data, 提供点分路径取值工具
 */
import { env } from '../env.js';

let mvuReady = false;

export async function ensureMvuReady() {
  if (mvuReady) return true;
  try {
    if (typeof window.waitGlobalInitialized !== 'function') return false;
    await window.waitGlobalInitialized('Mvu');
    mvuReady = true;
    console.log('[卡塞尔论坛][MVU] 变量框架已就绪');
    return true;
  } catch (e) {
    // MVU 未安装或超时 —— 静默降级, 不影响其他功能
    return false;
  }
}

/**
 * 获取最新楼层的 MVU stat_data
 * @returns Promise<Record<string, any> | null>
 */
export async function getLatestStatData() {
  if (!(await ensureMvuReady())) return null;
  try {
    const Mvu = window.Mvu;
    if (!Mvu?.getMvuData) return null;
    const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    return data?.stat_data || null;
  } catch (e) {
    console.warn('[卡塞尔论坛][MVU] 读取 stat_data 失败:', e);
    return null;
  }
}

/** 点分路径取值, 如 getValue(data, '世界.当前日期时间') */
export function getValue(data, path) {
  if (!data || !path) return undefined;
  let cur = data;
  for (const seg of String(path).split('.')) {
    if (cur == null) return undefined;
    // 数组字段自动取第一个元素
    if (Array.isArray(cur)) cur = cur[0];
    cur = cur[seg];
  }
  if (Array.isArray(cur)) cur = cur[0];
  return cur;
}

/** 从 stat_data 中提炼手机状态栏/学籍卡可用的摘要字段 (字段不存在则忽略) */
export function summarizeMvu(statData) {
  if (!statData) return null;
  const pick = (path) => {
    const v = getValue(statData, path);
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'object') {
      // Record 型字段: 若有 描述/内容/名称 之类的主字段则取之, 否则 JSON 化
      return v['描述'] || v['内容'] || v['名称'] || v['text'] || JSON.stringify(v);
    }
    return String(v);
  };
  const summary = {
    datetime: pick('世界.当前日期时间') || pick('世界.时间') || pick('时间'),
    location: pick('世界.当前地点') || pick('世界.地点') || pick('地点'),
    task: pick('世界.当前任务'),
    clue: pick('世界.当前线索'),
  };
  // 好感度: 扫描顶层角色对象下的 *好感度 字段
  const affinity = {};
  for (const key of Object.keys(statData)) {
    const node = statData[key];
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    for (const sub of Object.keys(node)) {
      if (sub.endsWith('好感度')) {
        const v = node[sub];
        const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ''));
        if (!Number.isNaN(num)) affinity[key] = num;
      }
    }
  }
  if (Object.keys(affinity).length) summary.affinity = affinity;
  return summary.datetime || summary.location || Object.keys(affinity).length ? summary : null;
}
