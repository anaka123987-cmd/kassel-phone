<script setup>
/**
 * 手机面板外壳: 320 × min(640px, 92vh), 圆角 42px
 * - 从悬浮按钮位置以 scale + opacity 动画展开, 最小化时反向收回
 * - 顶部状态栏: 时间 (MVU 日期时间优先) / 地点 / 连接状态 / 最小化按钮
 * - 底部 tab: 论坛 / 私信 / 学籍 / 资讯 / 设置
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import KpIcon from './KpIcon.vue';
import { store, unreadTotal } from '../store.js';
import { hostWindow, hostDocument } from '../env.js';
import { tavernAvailable } from '../services/tavern.js';
import ForumApp from '../apps/ForumApp.vue';
import MessageApp from '../apps/MessageApp.vue';
import ProfileApp from '../apps/ProfileApp.vue';
import NewsApp from '../apps/NewsApp.vue';
import SettingsView from '../components/SettingsView.vue';

const VIEWS = {
  forum: { comp: ForumApp, icon: 'forum', label: '论坛' },
  messages: { comp: MessageApp, icon: 'send', label: '私信' },
  profile: { comp: ProfileApp, icon: 'id-card', label: '学籍' },
  news: { comp: NewsApp, icon: 'megaphone', label: '资讯' },
  settings: { comp: SettingsView, icon: 'cog', label: '设置' },
};

const tabs = Object.keys(VIEWS);

const resizeTick = ref(0);
const now = ref(new Date());

let clockTimer = null;

const panelH = computed(() => {
  void resizeTick.value;
  const win = hostWindow();
  return Math.min(640, Math.round(win.innerHeight * 0.92));
});

const panelStyle = computed(() => {
  void resizeTick.value;
  const win = hostWindow();
  const W = 320;
  const H = panelH.value;
  const btnCx = store.fabPos.x + 32;
  const btnCy = store.fabPos.y + 32;

  // 手动拖动过 → 使用自由位置
  if (panelFree.value) {
    return {
      left: `${Math.round(panelFree.value.x)}px`,
      top: `${Math.round(panelFree.value.y)}px`,
      height: `${H}px`,
      transformOrigin: '50% 50%',
    };
  }

  let x = btnCx - W / 2;
  let y = btnCy - H - 20;
  if (y < 8) y = btnCy + 20; // 上方放不下 → 展开到按钮下方
  x = Math.min(Math.max(8, x), Math.max(8, win.innerWidth - W - 8));
  y = Math.min(Math.max(8, y), Math.max(8, win.innerHeight - H - 8));

  const originX = ((btnCx - x) / W) * 100;
  const originY = ((btnCy - y) / H) * 100;
  return {
    left: `${Math.round(x)}px`,
    top: `${Math.round(y)}px`,
    height: `${H}px`,
    transformOrigin: `${originX.toFixed(1)}% ${originY.toFixed(1)}%`,
  };
});

const clockText = computed(() => {
  const d = now.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

const displayTime = computed(() => store.mvu?.datetime || clockText.value);

/* ---------------- 面板拖动 (拖状态栏移动手机窗口) ---------------- */

const panelFree = ref(null); // 手动拖动后的位置; null = 锚定悬浮按钮
let dragCtx = null;

function clampFree(x, y) {
  void resizeTick.value;
  const win = hostWindow();
  const W = 320;
  const H = panelH.value;
  // 保持手机至少 60px 留在视口内
  return {
    x: Math.min(Math.max(-(W - 60), x), Math.max(0, win.innerWidth - 60)),
    y: Math.min(Math.max(0, y), Math.max(0, win.innerHeight - 60)),
  };
}

function onStatusbarDown(e) {
  if (e.target.closest('button')) return; // 按在按钮上不拖动
  if (e.button !== undefined && e.button !== 0) return;
  const phone = hostDocument().querySelector('.kp-phone');
  if (!phone) return;
  const r = phone.getBoundingClientRect();
  dragCtx = { startX: e.clientX, startY: e.clientY, origX: r.x, origY: r.y };
  panelFree.value = { x: r.x, y: r.y };
  const el = e.currentTarget;
  try {
    el.setPointerCapture(e.pointerId);
  } catch (err) { /* noop */ }
  el.addEventListener('pointermove', onStatusbarMove);
  el.addEventListener('pointerup', onStatusbarUp);
  el.addEventListener('pointercancel', onStatusbarUp);
}

function onStatusbarMove(e) {
  if (!dragCtx) return;
  panelFree.value = clampFree(
    dragCtx.origX + (e.clientX - dragCtx.startX),
    dragCtx.origY + (e.clientY - dragCtx.startY),
  );
  e.preventDefault();
}

function onStatusbarUp(e) {
  dragCtx = null;
  const el = e.currentTarget;
  el.removeEventListener('pointermove', onStatusbarMove);
  el.removeEventListener('pointerup', onStatusbarUp);
  el.removeEventListener('pointercancel', onStatusbarUp);
}

function onKey(e) {
  if (e.key === 'Escape' && store.expanded) store.expanded = false;
}

function onResize() {
  resizeTick.value += 1;
  // 自由位置跟随视口重钳制
  if (panelFree.value) {
    panelFree.value = clampFree(panelFree.value.x, panelFree.value.y);
  }
}

// 每次展开都强制按当前视口重算锚点 (视口可能在面板收起期间变化过)
watch(
  () => store.expanded,
  (v) => {
    if (v) onResize();
  },
);

function minimize() {
  store.expanded = false;
  panelFree.value = null; // 收起后下次展开重新锚定按钮
}

onMounted(() => {
  clockTimer = setInterval(() => (now.value = new Date()), 20000);
  const win = hostWindow();
  win.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener?.('resize', onResize);
  hostDocument().addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  clearInterval(clockTimer);
  const win = hostWindow();
  win.removeEventListener('resize', onResize);
  win.visualViewport?.removeEventListener?.('resize', onResize);
  hostDocument().removeEventListener('keydown', onKey);
});
</script>

<template>
  <Transition enter-active-class="kp-phone-anim-in" leave-active-class="kp-phone-anim-out">
    <div v-if="store.expanded" class="kp-phone" :style="panelStyle">
      <!-- 顶部状态栏 (可按住拖动手机窗口) -->
      <div class="kp-statusbar" title="按住拖动 · Esc 收起" @pointerdown="onStatusbarDown">
        <span class="kp-sb-time">{{ displayTime }}</span>
        <KpIcon v-if="store.mvu?.location" i="map-pin" class="kp-sb-loc" :title="store.mvu.location" />
        <span class="kp-sb-spacer"></span>
        <span class="kp-sb-right">
          <KpIcon :i="store.pipeline.running ? 'refresh' : 'wifi'" :class="{ 'kp-sb-spinning': store.pipeline.running }" />
          <span class="kp-sb-dot" :class="{ 'kp-offline': !tavernAvailable() }"></span>
          <button class="kp-minbtn" title="收起 (Esc)" @click="minimize">
            <KpIcon i="minus" />
          </button>
        </span>
      </div>

      <!-- 内容区 -->
      <div class="kp-content">
        <div v-for="tab in tabs" :key="tab" v-show="store.activeTab === tab" class="kp-view">
          <component :is="VIEWS[tab].comp" />
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="kp-tabbar">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="kp-tab"
          :class="{ 'kp-active': store.activeTab === tab }"
          @click="store.activeTab = tab"
        >
          <KpIcon :i="VIEWS[tab].icon" />
          <span>{{ VIEWS[tab].label }}</span>
          <span v-if="tab === 'messages' && unreadTotal > 0" class="kp-tab-badge">{{ unreadTotal }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

