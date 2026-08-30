<script setup>
/**
 * 论坛 App: 版块筛选 → 帖子列表 → 帖子详情 (点赞 / 本地回帖)
 */
import { ref, computed } from 'vue';
import { store, isPostLiked, toggleLikePost, persistContent, showToast } from '../store.js';
import { refreshPhoneContent } from '../services/pipeline.js';
import { isMultiApi } from '../store.js';

const activeBoard = ref('全部');
const openPostId = ref(null);
const replyDraft = ref('');

const boards = computed(() => ['全部', ...(store.content.forum?.boards || []).filter((b) => b !== '全部')]);

const posts = computed(() => {
  const list = store.content.forum?.posts || [];
  if (activeBoard.value === '全部') return list;
  return list.filter((p) => p.board === activeBoard.value);
});

const openPost = computed(() => (store.content.forum?.posts || []).find((p) => p.id === openPostId.value) || null);

const refreshing = computed(() => store.pipeline.running);

function hueColor(h) {
  return `hsl(${Number(h) || 200}, 55%, 60%)`;
}

function open(post) {
  openPostId.value = post.id;
  replyDraft.value = '';
}

function back() {
  openPostId.value = null;
}

function like(post) {
  toggleLikePost(post);
}

function submitReply() {
  const text = replyDraft.value.trim();
  if (!text || !openPost.value) return;
  openPost.value.replies = openPost.value.replies || [];
  openPost.value.replies.push({
    author: store.personaName || '我',
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    content: text,
  });
  replyDraft.value = '';
  persistContent();
  showToast('回帖已发布 (仅本机记录)');
}

async function refresh() {
  await refreshPhoneContent('论坛手动刷新');
}
</script>

<template>
  <!-- 帖子详情 -->
  <template v-if="openPost">
    <div class="kp-app-header">
      <button class="kp-iconbtn" @click="back"><i class="fa-solid fa-arrow-left"></i></button>
      <div>
        <div class="kp-app-title" style="font-size: 14px">帖子详情</div>
        <div class="kp-app-sub">{{ openPost.board }}</div>
      </div>
    </div>
    <div class="kp-scroll">
      <div class="kp-card">
        <div class="kp-post-head">
          <span class="kp-avatar" :style="{ background: hueColor(openPost.hue) }">{{ (openPost.author || '匿')[0] }}</span>
          <div class="kp-post-meta">
            <b>{{ openPost.author }}</b>
            <small>{{ openPost.time }}</small>
          </div>
          <button class="kp-like" :class="{ 'kp-liked': isPostLiked(openPost) }" @click="like(openPost)">
            <i class="fa-solid fa-heart"></i>{{ openPost.likes || 0 }}
          </button>
        </div>
        <div class="kp-post-title">{{ openPost.title }}</div>
        <div class="kp-post-body">{{ openPost.content }}</div>
      </div>

      <div class="kp-reply-count">共 {{ (openPost.replies || []).length }} 条回复</div>
      <div v-for="(r, i) in openPost.replies || []" :key="r._k || i" class="kp-card" style="padding: 10px 12px">
        <div class="kp-post-meta" style="margin-bottom: 4px">
          <b style="font-size: 12px; color: var(--kp-ice-soft)">{{ r.author }}</b>
          <small>{{ r.time }}</small>
        </div>
        <div class="kp-post-body" style="font-size: 12px">{{ r.content }}</div>
      </div>

      <div class="kp-reply-box">
        <input v-model="replyDraft" type="text" placeholder="友善回帖, 理性讨论…" @keydown.enter="submitReply" />
        <button class="kp-btn" :disabled="!replyDraft.trim()" @click="submitReply">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </template>

  <!-- 帖子列表 -->
  <template v-else>
    <div class="kp-app-header">
      <div>
        <div class="kp-app-title">卡塞尔<span class="kp-gold">论坛</span></div>
        <div class="kp-app-sub">Kassel BBS</div>
      </div>
      <div class="kp-header-actions">
        <button v-if="isMultiApi" class="kp-iconbtn" :class="{ 'kp-spinning': refreshing }" title="刷新内容" @click="refresh">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>
    <div class="kp-board-chips">
      <button
        v-for="b in boards"
        :key="b"
        class="kp-chip"
        :class="{ 'kp-board-active': activeBoard === b }"
        @click="activeBoard = b"
      >
        {{ b }}
      </button>
    </div>
    <div class="kp-scroll">
      <div v-for="post in posts" :key="post.id" class="kp-card kp-tappable" @click="open(post)">
        <div class="kp-post-head">
          <span class="kp-avatar" :style="{ background: hueColor(post.hue) }">{{ (post.author || '匿')[0] }}</span>
          <div class="kp-post-meta">
            <b>{{ post.author }}</b>
            <small>{{ post.time }}</small>
          </div>
          <span v-if="post.pinned" class="kp-chip kp-red">置顶</span>
          <span v-else-if="post.hot" class="kp-chip kp-red"><i class="fa-solid fa-fire"></i>热</span>
        </div>
        <div class="kp-post-title">
          <span class="kp-post-board">[{{ post.board }}]</span>
          {{ post.title }}
        </div>
        <div class="kp-post-preview">{{ post.content }}</div>
        <div class="kp-post-foot">
          <span><i class="fa-regular fa-comment"></i> {{ (post.replies || []).length }}</span>
          <span><i class="fa-regular fa-heart"></i> {{ post.likes || 0 }}</span>
        </div>
      </div>
      <div v-if="!posts.length" class="kp-empty">
        <i class="fa-regular fa-folder-open"></i>
        这个版块还没有帖子
      </div>
    </div>
  </template>
</template>

