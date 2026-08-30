<script setup>
/**
 * 校园资讯 App: 公告/新闻列表, 点击展开正文
 */
import { ref, computed } from 'vue';
import KpIcon from '../components/KpIcon.vue';
import { store, goHome } from '../store.js';

const expandedId = ref(null);

const news = computed(() => store.content.news || []);

const tagIcon = {
  头条: 'star',
  校园: 'landmark',
  提醒: 'alert',
  活动: 'sparkles',
};

function toggle(item) {
  expandedId.value = expandedId.value === item.id ? null : item.id;
}
</script>

<template>
  <div class="kp-app-header">
    <button class="kp-iconbtn" title="返回桌面" @click="goHome"><KpIcon i="arrow-left" /></button>
    <div class="kp-head-main">
      <div class="kp-app-title">校园<span class="kp-gold">资讯</span></div>
      <div class="kp-app-sub">Campus News</div>
    </div>
  </div>
  <div class="kp-scroll">
    <div
      v-for="item in news"
      :key="item.id"
      class="kp-card kp-tappable kp-news-card"
      :class="{ 'kp-news-open': expandedId === item.id }"
      @click="toggle(item)"
    >
      <div class="kp-news-head">
        <span class="kp-chip" :class="{ 'kp-red': item.tag === '头条', 'kp-blue': item.tag === '提醒' }">
          <KpIcon :i="tagIcon[item.tag] || 'star'" />
          {{ item.tag }}
        </span>
        <small class="kp-news-time">{{ item.time }} · {{ item.source }}</small>
      </div>
      <div class="kp-news-title">{{ item.title }}</div>
      <div v-if="expandedId === item.id" class="kp-news-content">{{ item.content }}</div>
      <div v-else class="kp-news-preview">{{ item.content }}</div>
      <div class="kp-news-expand">
        <KpIcon :i="expandedId === item.id ? 'chevron-up' : 'chevron-down'" />
      </div>
    </div>
    <div v-if="!news.length" class="kp-empty">
      <KpIcon i="news" />
      暂无资讯
    </div>
  </div>
</template>

