<script setup>
/**
 * 根组件: 悬浮按钮 + 手机面板 + 轻提示
 * 轮询: 每 1s 检查楼层变化 (新 AI 回复 → 触发第二 API 刷新) + MVU 状态
 */
import { ref, watch, onMounted } from 'vue';
import FloatingButton from './components/FloatingButton.vue';
import PhonePanel from './components/PhonePanel.vue';
import { store, saveSettingsToStorage, log } from './store.js';
import { hostWindow, hostDocument } from './env.js';
import { ensureMvuReady, getLatestStatData, summarizeMvu } from './services/mvu.js';
import { getLastMessageIdSafe, getChatMessagesSafe, duringGeneratingSafe, getPersonaNameSafe } from './services/tavern.js';
import { ensureChatName, refreshPhoneContent } from './services/pipeline.js';

/* 设置变化 → 持久化 */
watch(() => store.settings, saveSettingsToStorage, { deep: true });

/* 减少动效: prefers-reduced-motion 或宿主页 st-reduce-motion 类 */
const reduceMotion = ref(false);
function updateReduceMotion() {
  const doc = hostDocument();
  const mq = hostWindow().matchMedia?.('(prefers-reduced-motion: reduce)');
  reduceMotion.value =
    !!(mq && mq.matches) ||
    doc.documentElement.classList.contains('st-reduce-motion') ||
    (doc.body && doc.body.classList.contains('st-reduce-motion'));
}

/* ---------------- 1s 轮询 ---------------- */

let lastFloorId = -1;
let lastFloorText = '';
let refreshTimer = null;

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshPhoneContent('检测到新回复'), 2500);
}

async function pollOnce() {
  try {
    // MVU 状态 (时间/地点/好感度)
    const stat = await getLatestStatData();
    store.mvu = summarizeMvu(stat);
    if (!store.personaName) store.personaName = getPersonaNameSafe();

    // 楼层变化检测
    const lastId = getLastMessageIdSafe();
    const msgs = getChatMessagesSafe(lastId);
    const text = msgs[0]?.message || '';
    if (lastId !== lastFloorId || text !== lastFloorText) {
      const prevId = lastFloorId;
      lastFloorId = lastId;
      lastFloorText = text;
      if (prevId >= 0 && lastId > prevId && store.settings.apiMode === 'multi') {
        if (!duringGeneratingSafe()) scheduleRefresh();
      }
    }
  } catch (e) {
    // 轮询异常静默, 避免刷屏
  }
}

onMounted(async () => {
  updateReduceMotion();
  try {
    const mq = hostWindow().matchMedia?.('(prefers-reduced-motion: reduce)');
    mq?.addEventListener?.('change', updateReduceMotion);
  } catch (e) { /* noop */ }

  await ensureChatName();
  await ensureMvuReady();
  await pollOnce();
  setInterval(pollOnce, 1000);
  store.ready = true;
  log(`组件就绪 (环境: ${store.chatName}, API 模式: ${store.settings.apiMode === 'multi' ? '多API' : '单API'})`);
});
</script>

<template>
  <FloatingButton />
  <PhonePanel />
  <div v-if="store.toast" class="kp-toast">{{ store.toast }}</div>
</template>
