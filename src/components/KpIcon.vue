<script setup>
/**
 * 内联 SVG 图标组件 (替代 Font Awesome)
 * 用法: <KpIcon i="send" :size="16"/>
 */
import { ICONS } from '../icons.js';

const props = defineProps({
  i: { type: String, required: true },
  size: { type: [Number, String], default: 15 },
});
</script>

<template>
  <svg
    class="kp-ico"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="ICONS[i] || ICONS['message-dots']"
  ></svg>
</template>
