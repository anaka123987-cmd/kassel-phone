<script setup>
/**
 * 设置 App: API 模式 / 第二 API 参数 / 正文提取规则 / 世界书条目勾选 / 调试
 */
import { ref, computed } from 'vue';
import { store, log, showToast, saveSettingsToStorage } from '../store.js';
import { getBoundWorldbooksSafe, tavernAvailable } from '../services/tavern.js';
import { refreshPhoneContent } from '../services/pipeline.js';

const tab = ref('api');
const tabs = [
  { id: 'api', label: 'API', icon: 'fa-plug' },
  { id: 'extract', label: '提取', icon: 'fa-filter' },
  { id: 'worldbook', label: '世界书', icon: 'fa-book-skull' },
  { id: 'debug', label: '调试', icon: 'fa-terminal' },
];

const S = store.settings;

/* -------- 世界书 -------- */
const wbBooks = ref([]);
const wbLoading = ref(false);
const wbLoaded = ref(false);
const wbOpen = ref({}); // 世界书折叠状态

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
      <i class="fa-solid" :class="t.icon"></i>{{ t.label }}
    </button>
  </div>

  <div class="kp-scroll">
    <!-- API 模式 -->
    <template v-if="tab === 'api'">
      <div class="kp-set-section">
        <div class="kp-set-title"><i class="fa-solid fa-toggle-on"></i> API 模式</div>
        <div class="kp-mode-row">
          <button class="kp-mode-btn" :class="{ 'kp-active': S.apiMode === 'single' }" @click="S.apiMode = 'single'">
            <i class="fa-solid fa-house-signal"></i>
            <b>单 API</b>
            <small>静态内容 + MVU 联动</small>
          </button>
          <button class="kp-mode-btn" :class="{ 'kp-active': S.apiMode === 'multi' }" @click="S.apiMode = 'multi'">
            <i class="fa-solid fa-tower-broadcast"></i>
            <b>多 API</b>
            <small>第二 API 生成论坛内容</small>
          </button>
        </div>
        <div class="kp-set-row" style="margin-top: 6px">
          <span class="kp-set-label">失败时降级为主 API<small>第二 API 失败后改用酒馆当前源生成</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.fallbackMainApi }" @click="S.fallbackMainApi = !S.fallbackMainApi"></button>
        </div>
      </div>

      <div class="kp-set-section">
        <div class="kp-set-title"><i class="fa-solid fa-satellite"></i> 第二 API 参数</div>
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

    <!-- 正文提取 -->
    <template v-if="tab === 'extract'">
      <div class="kp-set-section">
        <div class="kp-set-title"><i class="fa-solid fa-filter"></i> 楼层正文提取规则</div>
        <div class="kp-set-col">
          <label class="kp-field"><span>提取标签 (仅对 AI 楼层生效)</span>
            <input v-model="S.extraction.tag" type="text" placeholder="content → 提取 <content> 内正文" />
          </label>
          <label class="kp-field"><span>附加提取标签 (留空不附加)</span>
            <input v-model="S.extraction.extraTag" type="text" placeholder="sum → 额外提取 <sum> 内容" />
          </label>
          <label class="kp-field"><span>提取楼层数 (最近 N 楼)</span>
            <input v-model.number="S.extraction.floors" type="number" min="1" max="30" />
          </label>
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
      </div>
    </template>

    <!-- 世界书 -->
    <template v-if="tab === 'worldbook'">
      <div class="kp-set-section">
        <div class="kp-set-title">
          <i class="fa-solid fa-book-skull"></i> 世界书条目选择
          <span class="kp-chip" style="margin-left: auto">已选 {{ selectedCount }} 条</span>
        </div>
        <div v-if="!tavernAvailable()" class="kp-empty" style="padding: 14px">
          <i class="fa-solid fa-plug-circle-xmark"></i>
          世界书功能需要在酒馆内使用
        </div>
        <template v-else>
          <button class="kp-btn kp-ghost" style="width: 100%; margin-bottom: 8px" :disabled="wbLoading" @click="loadWorldbooks">
            <i class="fa-solid" :class="wbLoading ? 'fa-spinner kp-spin' : 'fa-arrows-rotate'"></i>
            {{ wbLoaded ? '重新加载世界书' : '加载本卡绑定的世界书' }}
          </button>
          <div v-for="book in wbBooks" :key="book.name" class="kp-wb-book">
            <div class="kp-wb-book-head" @click="wbOpen[book.name] = !wbOpen[book.name]">
              <i class="fa-solid" :class="wbOpen[book.name] ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
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
            <i class="fa-solid fa-book-bookmark"></i>
            当前角色卡没有绑定世界书
          </div>
        </template>
      </div>
    </template>

    <!-- 调试 -->
    <template v-if="tab === 'debug'">
      <div class="kp-set-section">
        <div class="kp-set-title"><i class="fa-solid fa-terminal"></i> 调试</div>
        <div class="kp-set-row">
          <span class="kp-set-label">控制台详细日志<small>区分 主API / 第二API / 提取 / 世界书</small></span>
          <button class="kp-switch" :class="{ 'kp-on': S.debugLog }" @click="S.debugLog = !S.debugLog"></button>
        </div>
        <button class="kp-btn" style="width: 100%; margin: 8px 0" :disabled="refreshing || S.apiMode !== 'multi'" @click="refreshNow">
          <i class="fa-solid" :class="refreshing ? 'fa-spinner kp-spin' : 'fa-rotate-right'"></i>
          {{ S.apiMode !== 'multi' ? '切到多 API 模式后可用' : refreshing ? '正在生成…' : '立即刷新手机内容' }}
        </button>
        <div class="kp-log">{{ store.logs.length ? store.logs.join('\n') : '暂无日志' }}</div>
      </div>
      <div class="kp-set-section">
        <div class="kp-set-title"><i class="fa-solid fa-database"></i> 存储</div>
        <div class="kp-btn-row">
          <button class="kp-btn kp-ghost" @click="resetButtonPos"><i class="fa-solid fa-location-crosshairs"></i> 重置按钮位置</button>
          <button class="kp-btn kp-danger" @click="clearContentCache"><i class="fa-solid fa-trash-can"></i> 清除内容缓存</button>
        </div>
      </div>
    </template>
  </div>
</template>

