<script setup>
/**
 * 手机面板外壳: 320 × min(640px, 92vh), 圆角 42px
 * - 从悬浮按钮位置以 scale + opacity 动画展开, 最小化时反向收回
 * - 顶部状态栏: 时间 (MVU 日期时间优先) / 地点 / 连接状态 / 最小化按钮
 * - 底部 tab: 论坛 / 私信 / 学籍 / 资讯 / 设置
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, unreadTotal } from '../store.js';
import { hostWindow } from '../env.js';
import { tavernAvailable } from '../services/tavern.js';
import ForumApp from '../apps/ForumApp.vue';
import MessageApp from '../apps/MessageApp.vue';
import ProfileApp from '../apps/ProfileApp.vue';
import NewsApp from '../apps/NewsApp.vue';
import SettingsView from '../components/SettingsView.vue';

const VIEWS = {
  forum: { comp: ForumApp, icon: 'fa-comments', label: '论坛' },
  messages: { comp: MessageApp, icon: 'fa-paper-plane', label: '私信' },
  profile: { comp: ProfileApp, icon: 'fa-id-card', label: '学籍' },
  news: { comp: NewsApp, icon: 'fa-bullhorn', label: '资讯' },
  settings: { comp: SettingsView, icon: 'fa-gear', label: '设置' },
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

function onResize() {
  resizeTick.value += 1;
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
}

onMounted(() => {
  clockTimer = setInterval(() => (now.value = new Date()), 20000);
  const win = hostWindow();
  win.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener?.('resize', onResize);
});

onBeforeUnmount(() => {
  clearInterval(clockTimer);
  const win = hostWindow();
  win.removeEventListener('resize', onResize);
  win.visualViewport?.removeEventListener?.('resize', onResize);
});
</script>

<template>
  <Transition enter-active-class="kp-phone-anim-in" leave-active-class="kp-phone-anim-out">
    <div v-if="store.expanded" class="kp-phone" :style="panelStyle">
      <!-- 顶部状态栏 -->
      <div class="kp-statusbar">
        <span class="kp-sb-time">{{ displayTime }}</span>
        <i v-if="store.mvu?.location" class="fa-solid fa-location-dot kp-sb-loc" :title="store.mvu.location"></i>
        <span class="kp-sb-spacer"></span>
        <span class="kp-sb-right">
          <i class="fa-solid" :class="store.pipeline.running ? 'fa-sync kp-sb-spinning' : 'fa-signal'"></i>
          <span class="kp-sb-dot" :class="{ 'kp-offline': !tavernAvailable() }"></span>
          <button class="kp-minbtn" title="最小化" @click="minimize">
            <i class="fa-solid fa-minus"></i>
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
          <i class="fa-solid" :class="VIEWS[tab].icon"></i>
          <span>{{ VIEWS[tab].label }}</span>
          <span v-if="tab === 'messages' && unreadTotal > 0" class="kp-tab-badge">{{ unreadTotal }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

