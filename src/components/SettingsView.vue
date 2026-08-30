<script setup>
/**
 * 设置中心: 7 tab
 * API(模式/第二API/论坛生成模式) / 同步(剧情消息双向) / 提取 / 世界书 / 提示词 / 外观 / 调试
 */
import { ref, computed } from 'vue';
import KpIcon from './KpIcon.vue';
import { store, log, showToast, saveSettingsToStorage } from '../store.js';
import { getBoundWorldbooksSafe, tavernAvailable } from '../services/tavern.js';
import { refreshPhoneContent } from '../services/pipeline.js';
import { syncPhoneInjection, installDisplayRegex } from '../services/injector.js';
import { DEFAULT_PROMPTS } from '../services/prompts.js';
import { SYNC_FORMAT_DOC } from '../services/msgSync.js';

const tab = ref('api');
const tabs = [
  { id: 'api', label: 'API', icon: 'plug' },
  { id: 'sync', label: '同步', icon: 'rss' },
  { id: 'extract', label: '提取', icon: 'filter' },
  { id: 'worldbook', label: '世界书', icon: 'book' },
  { id: 'prompt', label: '提示词', icon: 'pen' },
  { id: 'look', label: '外观', icon: 'palette' },
  { id: 'debug', label: '调试', icon: 'terminal' },
];

const S = store.settings;

/* -------- 主题色 -------- */
const ACCENTS = [
  { id: 'bronze', label: '青铜金', color: '#c9a86a' },
  { id: 'crimson', label: '龙炎红', color: '#d88088' },
  { id: 'ice', label: '冰海蓝', color: '#7fb8d8' },
  { id: 'violet', label: '黄昏紫', color: '#b08fd8' },
];

/* -------- 提示词中心: 每个提示词完整可编辑, 单独恢复默认 -------- */
// [key, 标题, 说明, 行数]
const PROMPT_FIELDS = [
  { key: 'preset', label: '前置文本 (破限 / 风格前缀)', desc: '置于所有生成请求最前。留空不注入。可自行填写你惯用的破限头部或文风要求。', rows: 4 },
  { key: 'base', label: '公共设定', desc: '每次内容生成请求的头部, 定义 AI 扮演的角色。', rows: 4 },
  { key: 'forum', label: '论坛提示词', desc: '守夜人论坛板块的生成要求 (配合「生成范围」开关)。', rows: 7 },
  { key: 'messages', label: '私信提示词', desc: '角色会话板块的生成要求。', rows: 6 },
  { key: 'news', label: '资讯提示词', desc: '校园资讯板块的生成要求。', rows: 5 },
  { key: 'forumReply', label: '回帖回应提示词', desc: '论坛回帖实时回复用的轻量请求。', rows: 4 },
  { key: 'digest', label: '注入 · 手机摘要模板', desc: '常驻注入的摘要文案。占位符: {{info}} 全部摘要 / {{time}} {{location}} {{posts}} {{postPreview}} {{unread}} {{news}}', rows: 4 },
  { key: 'formatSpec', label: '注入 · 手机消息格式规范', desc: '教 AI 用 <手机消息|角色名> 格式给手机发消息的说明。', rows: 5 },
  { key: 'reply', label: '注入 · 手机回复模板', desc: '在手机里回消息时注入的文案。占位符: {{action}} 动作描述 / {{chat}} 会话名 / {{text}} 消息内容', rows: 3 },
];

function resetPromptField(key) {
  S.prompts[key] = DEFAULT_PROMPTS[key] ?? '';
  showToast('已恢复该条默认提示词');
}

const promptTotal = computed(() =>
  PROMPT_FIELDS.reduce((s, f) => s + (S.prompts[f.key] || '').length, 0),
);

function resetPrompt() {
  S.prompts = { ...DEFAULT_PROMPTS };
  saveSettingsToStorage();
  showToast('已恢复全部默认提示词');
}

/* -------- 世界书 -------- */
const wbBooks = ref([]);
const wbLoading = ref(false);
const wbLoaded = ref(false);
const wbOpen = ref({});

async function loadWorldbooks() {
  if (!tavernAvailable()) {
    showToast('演示模式: 世界书功能需在酒馆内使用');
    return;
  }
  wbLoading.value = true;
  try {
    wbBooks.value = await getBoundWorldbooksSafe();
    wbLoaded.value = true;
    for (const b of wbBooks.value) {
      if (!S.worldbookSelection[b.name]) S.worldbookSelection[b.name] = [];
    }
    const total = wbBooks.value.reduce((s, b) => s + b.entries.length, 0);
    log(`[世界书] 已加载 ${wbBooks.value.length} 本世界书, 共 ${total} 个条目`);
  } catch (e) {
    log(`[世界书] 加载失败: ${e?.message || e}`);
    showToast('世界书加载失败, 详见控制台');
  } finally {
    wbLoading.value = false;
  }
}

function entrySelected(bookName, uid) {
  return (S.worldbookSelection[bookName] || []).includes(uid);
}

function toggleEntry(bookName, uid) {
  const list = S.worldbookSelection[bookName] || (S.worldbookSelection[bookName] = []);
  const idx = list.indexOf(uid);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(uid);
}

const selectedCount = computed(() =>
  Object.values(S.worldbookSelection || {}).reduce((s, l) => s + (l?.length || 0), 0),
);

function toggleBook(book) {
  const cur = S.worldbookSelection[book.name] || [];
  S.worldbookSelection[book.name] = cur.length === book.entries.length ? [] : book.entries.map((e) => e.uid);
}

/* -------- 调试 -------- */
const refreshing = computed(() => store.pipeline.running);

async function refreshNow() {
  await refreshPhoneContent('设置页手动触发');
}

function clearContentCache() {
  try {
    localStorage.removeItem(`kassel_phone_content_${store.chatName}`);
    showToast('内容缓存已清除 (设置保留)');
    log('[存储] 已清除当前聊天的内容缓存');
  } catch (e) { /* noop */ }
}

function resetButtonPos() {
  S.buttonPos = null;
  saveSettingsToStorage();
  showToast('按钮位置已重置, 刷新页面生效');
}

/* -------- 提取量估算 -------- */
const extractionInfo = computed(() => {
  const info = store.lastExtraction;
  if (!info) return '尚未执行过提取 (多 API 刷新后显示)';
  const tokens = Math.round(info.chars / 1.6);
  return `上次提取: 最近 ${info.floors} 楼 → ${info.chars} 字 ≈ ${tokens} tokens`;
});

function reinstallInjection() {
  const ok = syncPhoneInjection();
  showToast(ok ? '注入已更新 (酒馆内生效)' : '当前环境不支持注入');
}
</script>

<template>
  <div class="kp-app-header">
    <div>
      <div class="kp-app-title">设置<span class="kp-gold">中心</span></div>
      <div class="kp-app-sub">Settings</div>
    </div>
  </div>

  <div class="kp-set-tabs">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="kp-set-tab"
      :class="{ 'kp-active': tab === t.id }"
      @click="tab = t.id"
    >
      <KpIcon :i="t.icon" :size="13" />
      <span>{{ t.label }}</span>
    </button>
  </div>

  <div class="kp-scroll">
    <!-- ============ API ============ -->
    <template v-if="tab === 'api'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="sliders" /> API 模式</div>
        <div class="kp-mode-row">
          <button class="kp-mode-btn" :class="{ 'kp-active': S.apiMode === 'single' }" @click="S.apiMode = 'single'">
            <KpIcon i="wifi" :size="18" />
            <b>单 API</b>
            <small>静态内容 + 剧情同步</small>
          </button>
          <button class="kp-mode-btn" :class="{ 'kp-active': S.apiMode === 'multi' }" @click="S.apiMode = 'multi'">
            <KpIcon i="radio" :size="18" />
            <b>多 API</b>
            <small>第二 API 生成手机内容</small>
          </button>
        </div>
        <div class="kp-set-row" style="margin-top: 6px">
          <span class="kp-set-label">失败时降级为主 API<small>第二 API 失败后改用酒馆当前源生成</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.fallbackMainApi }" @click="S.fallbackMainApi = !S.fallbackMainApi"></button>
        </div>
        <div class="kp-set-row">
          <span class="kp-set-label">论坛生成模式<small>替换 = 论坛完全由 API 新生成</small></span>
          <div class="kp-seg">
            <button :class="{ 'kp-seg-on': S.forumMode === 'replace' }" @click="S.forumMode = 'replace'">替换</button>
            <button :class="{ 'kp-seg-on': S.forumMode === 'append' }" @click="S.forumMode = 'append'">追加</button>
          </div>
        </div>
      </div>

      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="radio" /> 第二 API 参数</div>
        <div class="kp-set-col">
          <label class="kp-field"><span>API 地址 (URL)</span>
            <input v-model="S.secondApi.url" type="text" placeholder="https://api.example.com/v1" />
          </label>
          <label class="kp-field"><span>API Key</span>
            <input v-model="S.secondApi.key" type="password" placeholder="sk-..." autocomplete="off" />
          </label>
          <label class="kp-field"><span>模型名</span>
            <input v-model="S.secondApi.model" type="text" placeholder="gpt-4o-mini / deepseek-chat ..." />
          </label>
          <div class="kp-set-row">
            <span class="kp-set-label">超时时间 (ms)</span>
            <input v-model.number="S.secondApi.timeout" type="number" min="1000" step="1000" style="width: 110px" />
          </div>
          <div class="kp-set-row">
            <span class="kp-set-label">最大重试次数</span>
            <input v-model.number="S.secondApi.retries" type="number" min="0" max="10" style="width: 110px" />
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 同步 ============ -->
    <template v-if="tab === 'sync'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="rss" /> 剧情 → 手机</div>
        <p class="kp-set-desc">AI 在回复中按以下格式输出消息, 手机私信自动接收 (开启注入后 AI 自动学会该格式, 也可写进角色卡):</p>
        <div class="kp-log">{{ SYNC_FORMAT_DOC }}</div>
        <button class="kp-btn kp-ghost" style="width: 100%; margin-top: 8px" @click="installDisplayRegex">
          <KpIcon i="shield" /> 一键安装显示过滤正则
        </button>
        <p class="kp-set-desc" style="margin-top: 6px">安装后标签在酒馆界面自动隐藏, 但保留在提示词中 (AI 能看到自己发过的消息)。</p>
      </div>

      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="send" /> 手机 → 剧情</div>
        <div class="kp-set-row">
          <span class="kp-set-label">回复注入最新楼层<small>在手机里回消息, AI 在下一轮对话中看到</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.sync.replyInject }" @click="S.sync.replyInject = !S.sync.replyInject"></button>
        </div>
        <div class="kp-set-row">
          <span class="kp-set-label">发送后自动触发回复<small>注入后立即触发生成 (消耗额度)</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.sync.autoTrigger }" @click="S.sync.autoTrigger = !S.sync.autoTrigger"></button>
        </div>
        <p class="kp-set-desc" style="margin-top: 6px">关闭回复注入时, 发送改为把内容填入酒馆输入框。</p>
      </div>

      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="radio" /> 手机状态注入</div>
        <div class="kp-set-row">
          <span class="kp-set-label">常驻注入手机摘要<small>热帖/未读私信/资讯 + 消息格式规范</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.sync.injectEnabled }" @click="S.sync.injectEnabled = !S.sync.injectEnabled; reinstallInjection()"></button>
        </div>
        <div class="kp-set-row">
          <span class="kp-set-label">注入深度<small>数值越小越贴近最新楼层 (建议 2-6)</small></span>
          <input v-model.number="S.sync.injectDepth" type="number" min="0" max="16" style="width: 110px" @change="reinstallInjection" />
        </div>
        <button class="kp-btn kp-ghost" style="width: 100%; margin-top: 6px" @click="reinstallInjection">
          <KpIcon i="refresh" /> 立即重新注入
        </button>
      </div>
    </template>

    <!-- ============ 提取 ============ -->
    <template v-if="tab === 'extract'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="filter" /> 楼层正文提取规则</div>
        <div class="kp-set-col">
          <label class="kp-field"><span>提取标签 (仅对 AI 楼层生效)</span>
            <input v-model="S.extraction.tag" type="text" placeholder="content → 提取 <content> 内正文" />
          </label>
          <label class="kp-field"><span>附加提取标签 (留空不附加)</span>
            <input v-model="S.extraction.extraTag" type="text" placeholder="sum → 额外提取 <sum> 内容" />
          </label>
          <div class="kp-set-row">
            <span class="kp-set-label">提取楼层数<small>最近 N 楼, 越多越贴剧情也越耗 token</small></span>
            <input v-model.number="S.extraction.floors" type="number" min="1" max="30" style="width: 110px" />
          </div>
          <div class="kp-set-row">
            <span class="kp-set-label">单楼提取字符上限<small>超出截断, 防止 token 爆炸 (0 = 不限)</small></span>
            <input v-model.number="S.extraction.maxCharsPerFloor" type="number" min="0" step="100" style="width: 110px" />
          </div>
          <div class="kp-set-row">
            <span class="kp-set-label">世界书最大注入字符<small>超出截断 (0 = 不限)</small></span>
            <input v-model.number="S.worldbookMaxChars" type="number" min="0" step="500" style="width: 110px" />
          </div>
          <div class="kp-set-row">
            <span class="kp-set-label">包含用户消息<small>用户楼层直接发送全部消息, 不做标签提取</small></span>
            <button class="kp-switch" :class="{ 'kp-on': S.extraction.includeUser }" @click="S.extraction.includeUser = !S.extraction.includeUser"></button>
          </div>
          <div class="kp-set-row">
            <span class="kp-set-label">剔除 HTML 注释<small>移除提取内容中的 &lt;!-- --&gt;</small></span>
            <button class="kp-switch" :class="{ 'kp-on': S.extraction.excludeHtmlComments }" @click="S.extraction.excludeHtmlComments = !S.extraction.excludeHtmlComments"></button>
          </div>
          <label class="kp-field"><span>排除块头 (提取块开头出现的文本)</span>
            <input v-model="S.extraction.excludeHead" type="text" placeholder="如: 开场白:" />
          </label>
          <label class="kp-field"><span>排除块尾 (提取块结尾出现的文本)</span>
            <input v-model="S.extraction.excludeTail" type="text" placeholder="如: (本章完)" />
          </label>
        </div>
        <div class="kp-log" style="margin-top: 8px">{{ extractionInfo }}</div>
      </div>
    </template>

    <!-- ============ 世界书 ============ -->
    <template v-if="tab === 'worldbook'">
      <div class="kp-set-section">
        <div class="kp-set-title">
          <KpIcon i="book" /> 世界书条目选择
          <span class="kp-chip" style="margin-left: auto">已选 {{ selectedCount }} 条</span>
        </div>
        <div v-if="!tavernAvailable()" class="kp-empty" style="padding: 14px">
          <KpIcon i="unplug" :size="26" />
          世界书功能需要在酒馆内使用
        </div>
        <template v-else>
          <button class="kp-btn kp-ghost" style="width: 100%; margin-bottom: 8px" :disabled="wbLoading" @click="loadWorldbooks">
            <KpIcon :i="wbLoading ? 'loader' : 'refresh'" :class="{ 'kp-spin': wbLoading }" />
            {{ wbLoaded ? '重新加载世界书' : '加载本卡绑定的世界书' }}
          </button>
          <div v-for="book in wbBooks" :key="book.name" class="kp-wb-book">
            <div class="kp-wb-book-head" @click="wbOpen[book.name] = !wbOpen[book.name]">
              <KpIcon :i="wbOpen[book.name] ? 'chevron-down' : 'chevron-right'" :size="13" />
              <span class="kp-wb-book-name">{{ book.name }}</span>
              <label class="kp-wb-book-count" @click.stop>
                <input
                  type="checkbox"
                  :checked="(S.worldbookSelection[book.name] || []).length === book.entries.length && book.entries.length > 0"
                  @change="toggleBook(book)"
                />
                {{ (S.worldbookSelection[book.name] || []).length }}/{{ book.entries.length }}
              </label>
            </div>
            <div v-if="wbOpen[book.name]" class="kp-wb-entries">
              <label v-for="en in book.entries" :key="en.uid" class="kp-wb-entry">
                <input type="checkbox" :checked="entrySelected(book.name, en.uid)" @change="toggleEntry(book.name, en.uid)" />
                <span class="kp-wb-name" :title="en.name">{{ en.name }}</span>
                <span v-if="!en.enabled" class="kp-chip kp-red">未启用</span>
              </label>
            </div>
          </div>
          <div v-if="wbLoaded && !wbBooks.length" class="kp-empty" style="padding: 14px">
            <KpIcon i="book-marked" :size="26" />
            当前角色卡没有绑定世界书
          </div>
        </template>
      </div>
    </template>

    <!-- ============ 提示词 ============ -->
    <template v-if="tab === 'prompt'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="pen" /> 生成范围</div>
        <p class="kp-set-desc">控制每次刷新生成哪些板块 (关闭的板块不生成也不覆盖现有内容)。</p>
        <div class="kp-gen-row">
          <button class="kp-gen-item" :class="{ 'kp-on': S.generation.forum }" @click="S.generation.forum = !S.generation.forum">
            <KpIcon i="forum" :size="15" />论坛
          </button>
          <button class="kp-gen-item" :class="{ 'kp-on': S.generation.messages }" @click="S.generation.messages = !S.generation.messages">
            <KpIcon i="send" :size="15" />私信
          </button>
          <button class="kp-gen-item" :class="{ 'kp-on': S.generation.news }" @click="S.generation.news = !S.generation.news">
            <KpIcon i="megaphone" :size="15" />资讯
          </button>
        </div>
        <div class="kp-set-row" style="margin-top: 8px">
          <span class="kp-set-label">回帖实时回复<small>论坛里回帖后, 第二 API 生成其他用户的回应</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.forumLiveReply }" @click="S.forumLiveReply = !S.forumLiveReply"></button>
        </div>
      </div>

      <div class="kp-set-section">
        <div class="kp-set-title">
          <KpIcon i="pen" /> 提示词中心
          <span class="kp-chip" style="margin-left: auto">共 {{ promptTotal }} 字</span>
        </div>
        <p class="kp-set-desc">
          每条提示词都完整展示、单独编辑、单独恢复默认。输出 JSON 格式为固定规范, 无需配置。
          组装顺序: 前置文本 → 公共设定 → 启用板块要求 → 固定格式 → 剧情摘要 → 世界书。
        </p>
        <details v-for="f in PROMPT_FIELDS" :key="f.key" class="kp-pset">
          <summary>
            <span class="kp-pset-name">{{ f.label }}</span>
            <span class="kp-pset-len">{{ (S.prompts[f.key] || '').length }} 字</span>
            <button class="kp-pset-reset" title="恢复此条默认" @click.stop="resetPromptField(f.key)">
              <KpIcon i="refresh" :size="11" />
            </button>
          </summary>
          <p class="kp-set-desc" style="margin: 6px 0">{{ f.desc }}</p>
          <textarea v-model="S.prompts[f.key]" class="kp-prompt-editor" :rows="f.rows" spellcheck="false"></textarea>
        </details>
        <button class="kp-btn kp-ghost" style="width: 100%; margin-top: 8px" @click="resetPrompt">
          <KpIcon i="refresh" /> 全部恢复默认
        </button>
      </div>
    </template>

    <!-- ============ 外观 ============ -->
    <template v-if="tab === 'look'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="palette" /> 主题色</div>
        <div class="kp-accent-row">
          <button
            v-for="a in ACCENTS"
            :key="a.id"
            class="kp-accent"
            :class="{ 'kp-accent-on': S.accent === a.id }"
            @click="S.accent = a.id"
          >
            <span class="kp-accent-dot" :style="{ background: a.color }"></span>
            <small>{{ a.label }}</small>
          </button>
        </div>
      </div>
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="pen" /> 自定义 CSS</div>
        <p class="kp-set-desc">追加到组件默认样式之后 (同特异性下覆盖默认), 实时生效并持久化。</p>
        <textarea
          v-model="S.customCss"
          class="kp-prompt-editor"
          style="min-height: 120px"
          placeholder="#kassel-phone-root .kp-phone { border-radius: 18px; }"
          spellcheck="false"
        ></textarea>
      </div>
    </template>

    <!-- ============ 调试 ============ -->
    <template v-if="tab === 'debug'">
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="terminal" /> 调试</div>
        <div class="kp-set-row">
          <span class="kp-set-label">控制台详细日志<small>区分 主API / 第二API / 提取 / 世界书 / 同步 / 注入</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.debugLog }" @click="S.debugLog = !S.debugLog"></button>
        </div>
        <button class="kp-btn" style="width: 100%; margin: 8px 0" :disabled="refreshing || S.apiMode !== 'multi'" @click="refreshNow">
          <KpIcon :i="refreshing ? 'loader' : 'refresh'" :class="{ 'kp-spin': refreshing }" />
          {{ S.apiMode !== 'multi' ? '切到多 API 模式后可用' : refreshing ? '正在生成…' : '立即刷新手机内容' }}
        </button>
        <div class="kp-log">{{ store.logs.length ? store.logs.join('\n') : '暂无日志' }}</div>
      </div>
      <div class="kp-set-section">
        <div class="kp-set-title"><KpIcon i="database" /> 存储</div>
        <div class="kp-btn-row">
          <button class="kp-btn kp-ghost" @click="resetButtonPos"><KpIcon i="crosshair" /> 重置按钮位置</button>
          <button class="kp-btn kp-danger" @click="clearContentCache"><KpIcon i="trash" /> 清除内容缓存</button>
        </div>
      </div>
    </template>
  </div>
</template>
