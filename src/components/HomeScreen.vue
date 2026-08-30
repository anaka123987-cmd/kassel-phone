<script setup>
/**
 * 手机桌面: 壁纸上的时钟部件 + App 图标网格
 * (壁纸层由 PhonePanel 渲染, 本组件只负责桌面内容)
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import KpIcon from './KpIcon.vue';
import { store, unreadTotal, openApp } from '../store.js';

const APPS = [
  { id: 'forum', icon: 'forum', label: '守夜人论坛', cls: 'kp-appicon-forum' },
  { id: 'messages', icon: 'send', label: '私信', cls: 'kp-appicon-messages' },
  { id: 'profile', icon: 'id-card', label: '学籍卡', cls: 'kp-appicon-profile' },
  { id: 'news', icon: 'megaphone', label: '资讯', cls: 'kp-appicon-news' },
  { id: 'settings', icon: 'cog', label: '设置', cls: 'kp-appicon-settings' },
];

const now = ref(new Date());
let clockTimer = null;

const timeText = computed(() => {
  if (store.mvu?.datetime) return store.mvu.datetime;
  const d = now.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

const dateText = computed(() => {
  const d = now.value;
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
});

onMounted(() => {
  clockTimer = setInterval(() => (now.value = new Date()), 20000);
});
onBeforeUnmount(() => clearInterval(clockTimer));
</script>

<template>
  <div class="kp-home">
    <!-- 时钟部件 -->
    <div class="kp-home-clock">
      <div class="kp-home-time">{{ timeText }}</div>
      <div class="kp-home-date">
        {{ dateText }}
        <span v-if="store.mvu?.location" class="kp-home-loc" :title="store.mvu.location">
          <KpIcon i="map-pin" :size="12" />{{ store.mvu.location }}
        </span>
      </div>
    </div>

    <!-- App 图标网格 -->
    <div class="kp-home-grid">
      <button
        v-for="app in APPS"
        :key="app.id"
        class="kp-appitem"
        @click="openApp(app.id)"
      >
        <span class="kp-appicon" :class="app.cls">
          <KpIcon :i="app.icon" :size="26" />
          <span
            v-if="app.id === 'messages' && unreadTotal > 0"
            class="kp-appbadge"
          >{{ unreadTotal > 99 ? '99+' : unreadTotal }}</span>
        </span>
        <span class="kp-applabel">{{ app.label }}</span>
      </button>
    </div>

    <!-- 底部品牌 -->
    <div class="kp-home-brand">ROYAL ACADEMY · NIGHT WATCHMEN</div>
  </div>
</template>
