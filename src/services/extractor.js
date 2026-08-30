/**
 * 楼层正文提取器
 *
 * 规则 (对应设置页「正文提取」):
 * - 标签提取仅对 AI 回复楼层生效; 用户楼层 (若包含) 直接发送全部消息文本
 * - 主提取标签 (如 content): 提取 <content>...</content> 内的正文; 没有该标签时使用整楼文本
 * - 附加提取标签 (如 sum): 在正文之外额外提取 <sum>...</sum> 的内容并附在末尾
 * - 可剔除 HTML 注释; 可配置排除块头/块尾文本
 */

function extractTaggedBlocks(text, tag) {
  if (!text || !tag) return [];
  const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${safe}\\b[^>]*>([\\s\\S]*?)<\\/${safe}\\s*>`, 'gi');
  const blocks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) blocks.push(m[1]);
  }
  return blocks;
}

function stripHtmlComments(text) {
  return String(text).replace(/<!--[\s\S]*?-->/g, '');
}

/** 剔除块头/块尾重复出现的指定文本 */
function trimEdges(text, head, tail) {
  let out = String(text).trim();
  const h = (head || '').trim();
  const t = (tail || '').trim();
  if (h) while (out.startsWith(h)) out = out.slice(h.length).trim();
  if (t) while (out.endsWith(t)) out = out.slice(0, out.length - t.length).trim();
  return out;
}

/** 对单个文本块应用排除规则 */
function applyExclusions(block, extraction) {
  let out = block;
  if (extraction.excludeHtmlComments) out = stripHtmlComments(out);
  out = trimEdges(out, extraction.excludeHead, extraction.excludeTail);
  out = out.trim();
  // 单楼字符上限 (防 token 爆炸; 0 = 不限)
  const cap = Number(extraction.maxCharsPerFloor) || 0;
  if (cap > 0 && out.length > cap) out = out.slice(0, cap) + '…(已截断)';
  return out;
}

/**
 * 提取楼层正文, 返回拼好的剧情文本
 * @param {object} settings 完整设置
 * @param {Array<{message_id:number, role:string, message:string}>} messages 已按楼层号升序
 * @returns {string}
 */
export function extractFloorsForPrompt(settings, messages) {
  const ex = settings.extraction;
  const sections = [];

  for (const msg of messages) {
    const isUser = msg.role === 'user';
    if (isUser && !ex.includeUser) continue;

    const floorNo = msg.message_id;
    const raw = msg.message || '';

    if (isUser) {
      // 用户楼层: 不做标签提取, 直接发送全部消息
      const text = raw.trim();
      if (text) sections.push(`--- 第${floorNo}楼 (用户输入) ---\n${text}`);
      continue;
    }

    // AI 楼层: 标签提取
    const mainBlocks = extractTaggedBlocks(raw, ex.tag);
    const bodyParts = (mainBlocks.length ? mainBlocks : [raw]).map((b) => applyExclusions(b, ex)).filter(Boolean);
    if (!bodyParts.length) continue;

    let section = `--- 第${floorNo}楼 (剧情正文) ---\n${bodyParts.join('\n')}`;

    // 附加提取标签 (如 <sum>)
    if (ex.extraTag) {
      const extraBlocks = extractTaggedBlocks(raw, ex.extraTag)
        .map((b) => applyExclusions(b, ex))
        .filter(Boolean);
      if (extraBlocks.length) section += `\n[摘要] ${extraBlocks.join(' / ')}`;
    }

    sections.push(section);
  }

  return sections.join('\n\n');
}
