<script setup>
/**
 * 私信 App: 角色会话列表 → 聊天视图
 * 发送 = triggerSlash('/setinput 文本') 填入酒馆输入框, 衔接 RP
 */
import { ref, nextTick, computed } from 'vue';
import { store, persistContent, showToast } from '../store.js';
import { triggerSlashSafe, tavernAvailable } from '../services/tavern.js';

const openChatId = ref(null);
const draft = ref('');
const bubbleListEl = ref(null);

const chats = computed(() => store.content.messages?.chats || []);
const openChat = computed(() => chats.value.find((c) => c.id === openChatId.value) || null);

function hueColor(h) {
  return `hsl(${Number(h) || 200}, 55%, 60%)`;
}

function open(chat) {
  openChatId.value = chat.id;
  if (chat.unread) {
    chat.unread = 0;
    persistContent();
  }
  scrollBottom();
}

function back() {
  openChatId.value = null;
}

function scrollBottom() {
  nextTick(() => {
    const el = bubbleListEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

async function send(text) {
  const content = (text ?? draft.value).trim();
  if (!content) return;
  if (!tavernAvailable()) {
    showToast('演示模式: 已模拟填入输入框');
  } else {
    await triggerSlashSafe(`/setinput ${content}`);
    showToast('已填入酒馆输入框, 确认后发送');
  }
  if (openChat.value) {
    openChat.value.messages = openChat.value.messages || [];
    openChat.value.messages.push({
      from: 'me',
      text: content,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    });
    persistContent();
    scrollBottom();
  }
  draft.value = '';
}
</script>

<template>
  <!-- 聊天视图 -->
  <template v-if="openChat">
    <div class="kp-app-header">
      <button class="kp-iconbtn" @click="back"><i class="fa-solid fa-arrow-left"></i></button>
      <span class="kp-avatar" :style="{ background: hueColor(openChat.hue) }">{{ openChat.name[0] }}</span>
      <div>
        <div class="kp-app-title" style="font-size: 14px">{{ openChat.name }}</div>
        <div class="kp-app-sub">{{ openChat.role }}</div>
      </div>
    </div>
    <div ref="bubbleListEl" class="kp-scroll kp-bubbles">
      <div
        v-for="(m, i) in openChat.messages || []"
        :key="m._k || i"
        class="kp-bubble-row"
        :class="{ 'kp-me': m.from === 'me' }"
      >
        <div class="kp-bubble" :class="{ 'kp-bubble-me': m.from === 'me' }">
          {{ m.text }}
          <small v-if="m.time">{{ m.time }}</small>
        </div>
      </div>
      <div v-if="!(openChat.messages || []).length" class="kp-empty">
        <i class="fa-regular fa-comment-dots"></i>
        还没有消息
      </div>
    </div>
    <div class="kp-chat-input">
      <div class="kp-quick-row">
        <button v-for="q in openChat.quickReplies || []" :key="q" class="kp-chip" @click="send(q)">{{ q }}</button>
      </div>
      <div class="kp-reply-box">
        <input v-model="draft" type="text" placeholder="输入消息, 将填入酒馆输入框…" @keydown.enter="send()" />
        <button class="kp-btn" :disabled="!draft.trim()" @click="send()">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </template>

  <!-- 会话列表 -->
  <template v-else>
    <div class="kp-app-header">
      <div>
        <div class="kp-app-title">通讯<span class="kp-gold">录</span></div>
        <div class="kp-app-sub">Messages</div>
      </div>
    </div>
    <div class="kp-scroll">
      <div v-for="chat in chats" :key="chat.id" class="kp-card kp-tappable kp-chat-row" @click="open(chat)">
        <span class="kp-avatar" :style="{ background: hueColor(chat.hue) }">{{ chat.name[0] }}</span>
        <div class="kp-chat-meta">
          <div class="kp-chat-line1">
            <b>{{ chat.name }}</b>
            <small>{{ chat.messages?.length ? chat.messages[chat.messages.length - 1].time : '' }}</small>
          </div>
          <div class="kp-chat-preview">
            {{ chat.messages?.length ? chat.messages[chat.messages.length - 1].text : '(暂无消息)' }}
          </div>
        </div>
        <span v-if="chat.unread" class="kp-fab-badge kp-chat-unread">{{ chat.unread }}</span>
      </div>
      <div v-if="!chats.length" class="kp-empty">
        <i class="fa-regular fa-address-book"></i>
        通讯录为空
      </div>
    </div>
  </template>
</template>

