<script setup>
/**
 * 手机外壳 (真机样式): 深色金属边框 + 前摄挖孔 + 屏幕
 * - 屏幕 = 壁纸层 + 状态栏 (可拖动手机窗口) + 舞台 (锁屏/桌面/应用) + 底部 Home 条
 * - 界面状态机: store.screen = 'lock' | 'home' | 应用 id
 * - 每次展开手机从锁屏开始; Esc: 应用→桌面, 桌面/锁屏→收起
 * - 从悬浮按钮位置以 scale + opacity 动画展开, 最小化时反向收回
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import KpIcon from './KpIcon.vue';
import { store } from '../store.js';
import { hostWindow, hostDocument } from '../env.js';
import { tavernAvailable } from '../services/tavern.js';
import ForumApp from '../apps/ForumApp.vue';
import MessageApp from '../apps/MessageApp.vue';
import ProfileApp from '../apps/ProfileApp.vue';
import NewsApp from '../apps/NewsApp.vue';
import SettingsView from '../components/SettingsView.vue';
import HomeScreen from '../components/HomeScreen.vue';

const VIEWS = {
  forum: { comp: ForumApp, label: '守夜人论坛' },
  messages: { comp: MessageApp, label: '私信' },
  profile: { comp: ProfileApp, label: '学籍卡' },
  news: { comp: NewsApp, label: '校园资讯' },
  settings: { comp: SettingsView, label: '设置' },
};

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

const isApp = computed(() => !!VIEWS[store.screen]);

/* ---------------- 壁纸: 图床 URL 优先, 否则内置预设 ---------------- */

const wallStyle = computed(() => {
  const url = (store.settings.wallpaperUrl || '').trim();
  if (!url) return null;
  // 暗色遮罩压住壁纸, 保证状态栏/图标可读
  return {
    backgroundImage: `linear-gradient(rgba(8,10,18,.42), rgba(8,10,18,.55)), url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
});

const wallPresetClass = computed(() => {
  const url = (store.settings.wallpaperUrl || '').trim();
  if (url) return '';
  return `kp-wp-${store.settings.wallpaperId || 'bronze'}`;
});

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

/* ---------------- 界面切换 ---------------- */

// 锁屏显示时刻: 用于忽略展开瞬间穿透过来的同一次点击
let lockShownAt = 0;

function armLock() {
  lockShownAt = Date.now();
}

function unlock() {
  if (Date.now() - lockShownAt < 350) return;
  store.screen = 'home';
}

function onKey(e) {
  if (e.key !== 'Escape' || !store.expanded) return;
  if (store.screen !== 'home' && store.screen !== 'lock') {
    store.screen = 'home'; // 应用 → 桌面
  } else {
    minimize(); // 桌面/锁屏 → 收起
  }
}

function onResize() {
  resizeTick.value += 1;
  // 自由位置跟随视口重钳制
  if (panelFree.value) {
    panelFree.value = clampFree(panelFree.value.x, panelFree.value.y);
  }
}

function minimize() {
  store.expanded = false;
  store.screen = 'lock'; // 收起后重新上锁
  panelFree.value = null; // 收起后下次展开重新锚定按钮
}

// 每次展开: 回到锁屏 + 按当前视口重算锚点
watch(
  () => store.expanded,
  (v) => {
    if (v) {
      store.screen = 'lock';
      armLock();
      onResize();
    }
  },
);

onMounted(() => {
  armLock();
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
      <div class="kp-screen" :class="wallPresetClass">
        <!-- 壁纸层 (图床 URL 或内置渐变) -->
        <div class="kp-wallpaper" :style="wallStyle"></div>

        <!-- 前摄挖孔 (装饰) -->
        <div class="kp-cam" title="按住状态栏拖动 · Esc 收起"></div>

        <!-- 状态栏 (可按住拖动手机窗口) -->
        <div class="kp-statusbar" @pointerdown="onStatusbarDown">
          <span class="kp-sb-time">{{ clockText }}</span>
          <span class="kp-sb-spacer"></span>
          <span class="kp-sb-right">
            <KpIcon i="signal" :size="13" />
            <KpIcon :i="store.pipeline.running ? 'refresh' : 'wifi'" :size="13" :class="{ 'kp-sb-spinning': store.pipeline.running }" />
            <KpIcon i="battery" :size="15" />
            <span class="kp-sb-dot" :class="{ 'kp-offline': !tavernAvailable() }"></span>
            <button class="kp-minbtn" title="收起 (Esc)" @click="minimize">
              <KpIcon i="minus" :size="13" />
            </button>
          </span>
        </div>

        <!-- 舞台: 桌面 / 应用 / 锁屏 -->
        <div class="kp-stage">
          <!-- 桌面 -->
          <Transition name="kp-scr">
            <HomeScreen v-if="store.screen === 'home'" class="kp-fill" />
          </Transition>

          <!-- 应用 (v-show 保持各应用内部状态) -->
          <div
            v-for="(v, id) in VIEWS"
            :key="id"
            v-show="store.screen === id"
            class="kp-fill kp-view kp-appscreen"
          >
            <component :is="v.comp" />
          </div>

          <!-- 锁屏 (最上层, 点按任意处解锁) -->
          <Transition name="kp-lock">
            <div v-if="store.screen === 'lock'" class="kp-lock" @click="unlock">
              <div class="kp-lock-clock">{{ clockText }}</div>
              <div class="kp-lock-date">卡塞尔学院 · NIGHT WATCHMEN</div>
              <div class="kp-lock-hint">
                <KpIcon i="chevron-up" :size="14" />
                <span>点按任意处解锁</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 底部 Home 条 (锁屏时不显示) -->
        <button
          v-show="store.screen !== 'lock'"
          class="kp-homebar"
          title="返回桌面"
          @click="store.screen = 'home'"
        >
          <span class="kp-homebar-pill"></span>
        </button>
      </div>
    </div>
  </Transition>
</template>
