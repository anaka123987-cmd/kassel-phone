<script setup>
/**
 * 悬浮按钮: 64px 圆形, 支持鼠标/触摸拖拽
 * - Pointer Events 统一鼠标与触摸
 * - 移动 > 4px 判定为拖拽 (不触发展开); 否则为点击 → 展开面板
 * - 拖拽时 scale(1.08) + grabbing; 结束后钳制在视口内并持久化位置
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, saveSettingsToStorage } from '../store.js';
import { hostWindow } from '../env.js';

const SIZE = 64;

const dragging = ref(false);
const pressed = ref(false);

const pos = reactive({ x: 0, y: 0 });

/** 面板展开时隐藏按钮, 避免与面板重叠 */
const hidden = computed(() => store.expanded);

const dragState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  origX: 0,
  origY: 0,
  moved: false,
};

const badge = computed(() => {
  const chats = store.content?.messages?.chats || [];
  return chats.reduce((s, c) => s + (c.unread ? 1 : 0), 0);
});

function clampToViewport(x, y) {
  const win = hostWindow();
  const maxX = Math.max(0, win.innerWidth - SIZE);
  const maxY = Math.max(0, win.innerHeight - SIZE);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

function defaultPos() {
  const win = hostWindow();
  return { x: win.innerWidth - SIZE - 16, y: win.innerHeight - SIZE - 16 };
}

function initPos() {
  const saved = store.settings.buttonPos;
  const base = saved ? { x: saved.x, y: saved.y } : defaultPos();
  const clamped = clampToViewport(base.x, base.y);
  pos.x = clamped.x;
  pos.y = clamped.y;
  store.fabPos = { x: pos.x, y: pos.y };
}

function persistPos() {
  store.settings.buttonPos = { x: Math.round(pos.x), y: Math.round(pos.y) };
  saveSettingsToStorage();
}

function syncPos() {
  store.fabPos = { x: pos.x, y: pos.y };
}

/* ---------------- 指针事件 ---------------- */

function onPointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  dragState.pointerId = e.pointerId;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  dragState.origX = pos.x;
  dragState.origY = pos.y;
  dragState.moved = false;
  pressed.value = true;
  const el = e.currentTarget;
  try {
    el.setPointerCapture(e.pointerId);
  } catch (err) { /* noop */ }
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);
}

function onPointerMove(e) {
  if (e.pointerId !== dragState.pointerId) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(dx, dy) > 4) {
    dragState.moved = true;
    dragging.value = true;
  }
  if (dragState.moved) {
    const next = clampToViewport(dragState.origX + dx, dragState.origY + dy);
    pos.x = next.x;
    pos.y = next.y;
    syncPos();
    e.preventDefault();
  }
}

function onPointerUp(e) {
  if (e.pointerId !== dragState.pointerId) return;
  detach(e.currentTarget);
  const wasDrag = dragState.moved;
  dragging.value = false;
  pressed.value = false;
  dragState.pointerId = null;
  if (wasDrag) {
    persistPos();
  } else if (!store.expanded) {
    store.expanded = true;
  }
}

function onPointerCancel(e) {
  if (e.pointerId !== dragState.pointerId) return;
  detach(e.currentTarget);
  dragging.value = false;
  pressed.value = false;
  dragState.pointerId = null;
  const clamped = clampToViewport(pos.x, pos.y);
  pos.x = clamped.x;
  pos.y = clamped.y;
  persistPos();
}

function detach(el) {
  el.removeEventListener('pointermove', onPointerMove);
  el.removeEventListener('pointerup', onPointerUp);
  el.removeEventListener('pointercancel', onPointerCancel);
  try {
    el.releasePointerCapture(dragState.pointerId);
  } catch (err) { /* noop */ }
}

function onResize() {
  const clamped = clampToViewport(pos.x, pos.y);
  if (clamped.x !== pos.x || clamped.y !== pos.y) {
    pos.x = clamped.x;
    pos.y = clamped.y;
    syncPos();
  }
}

let clampTimer = null;

onMounted(() => {
  initPos();
  const win = hostWindow();
  win.addEventListener('resize', onResize);
  // 兜底: 部分嵌入环境 (iframe 缩放 / 移动端旋转) 不派发 resize, 定期校验越界
  win.visualViewport?.addEventListener?.('resize', onResize);
  clampTimer = setInterval(onResize, 2000);
});

onBeforeUnmount(() => {
  const win = hostWindow();
  win.removeEventListener('resize', onResize);
  win.visualViewport?.removeEventListener?.('resize', onResize);
  clearInterval(clampTimer);
});

defineExpose({ pos, clampToViewport });
</script>

<template>
  <div
    class="kp-fab"
    :class="{ 'kp-dragging': dragging, 'kp-hidden': hidden }"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <span class="kp-fab-ring"></span>
    <!-- 内联 SVG 龙徽: 不依赖 Font Awesome, 保证任何环境下按钮图标可见 -->
    <svg class="kp-fab-icon" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs>
        <linearGradient id="kpGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f0d9a8" />
          <stop offset="0.5" stop-color="#e8c98a" />
          <stop offset="1" stop-color="#b98f4e" />
        </linearGradient>
      </defs>
      <!-- 盾形 -->
      <path
        d="M32 5 L55 13 V32 C55 46 45 55 32 60 C19 55 9 46 9 32 V13 Z"
        fill="none" stroke="url(#kpGold)" stroke-width="2.6"
      />
      <!-- 龙首/翼形纹章 -->
      <path
        d="M32 16 C27 22 20 24 15 24 C19 28 21 31 21 35 C25 33 28 33 31 35 L32 48 L33 35 C36 33 39 33 43 35 C43 31 45 28 49 24 C44 24 37 22 32 16 Z"
        fill="url(#kpGold)" opacity="0.95"
      />
      <circle cx="32" cy="28" r="2.4" fill="#0d1322" />
    </svg>
    <span v-if="badge > 0 && !hidden" class="kp-fab-badge">{{ badge }}</span>
  </div>
</template>
