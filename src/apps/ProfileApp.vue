<script setup>
/**
 * 学籍卡 App: 玩家档案
 * 字段优先级: persona 名 → MVU 可用字段 → 内置档案
 */
import { computed } from 'vue';
import KpIcon from '../components/KpIcon.vue';
import { store, goHome } from '../store.js';
import { BUILTIN_PROFILE } from '../data/builtin.js';

const profile = computed(() => ({
  ...BUILTIN_PROFILE,
  name: store.personaName || BUILTIN_PROFILE.name,
}));

const mvuRows = computed(() => {
  const m = store.mvu;
  if (!m) return [];
  const rows = [];
  if (m.datetime) rows.push({ icon: 'clock', label: '当前时间', value: m.datetime });
  if (m.location) rows.push({ icon: 'map-pin', label: '当前地点', value: m.location });
  if (m.task) rows.push({ icon: 'flag', label: '当前任务', value: m.task });
  if (m.clue) rows.push({ icon: 'search', label: '当前线索', value: m.clue });
  return rows;
});

const affinityRows = computed(() => {
  const aff = store.mvu?.affinity || {};
  return Object.entries(aff).map(([name, v]) => ({
    name,
    value: Math.max(0, Math.min(100, Number(v) || 0)),
  }));
});

function bloodColor(text) {
  if (/S/i.test(text)) return 'linear-gradient(135deg, #e8c98a, #b04a60)';
  if (/A/i.test(text)) return 'linear-gradient(135deg, #c9a86a, #9a7b45)';
  return 'linear-gradient(135deg, #7fb8d8, #5a7f9a)';
}
</script>

<template>
  <div class="kp-app-header">
    <button class="kp-iconbtn" title="返回桌面" @click="goHome"><KpIcon i="arrow-left" /></button>
    <div class="kp-head-main">
      <div class="kp-app-title">学籍<span class="kp-gold">卡</span></div>
      <div class="kp-app-sub">Student ID Card</div>
    </div>
  </div>
  <div class="kp-scroll">
    <!-- 卡片正面 -->
    <div class="kp-idcard">
      <div class="kp-idcard-top">
        <KpIcon i="shield" />
        <span>KASSEL ACADEMY</span>
        <KpIcon i="shield" />
      </div>
      <div class="kp-idcard-body">
        <div class="kp-idcard-avatar">
          {{ (profile.name || '学')[0] }}
        </div>
        <div class="kp-idcard-info">
          <div class="kp-idcard-name">{{ profile.name }}</div>
          <div class="kp-idcard-no">{{ profile.studentId }}</div>
          <div class="kp-idcard-grade">{{ profile.grade }}</div>
          <div class="kp-chip" style="margin-top: 5px">{{ profile.title }}</div>
        </div>
      </div>
      <div class="kp-idcard-blood" :style="{ background: bloodColor(profile.bloodline) }">
        <span class="kp-idcard-blood-label">血统评级</span>
        <span class="kp-idcard-blood-value">{{ profile.bloodline }}</span>
      </div>
    </div>

    <!-- 档案字段 -->
    <div class="kp-set-section">
      <div class="kp-set-title"><KpIcon i="folder" /> 学员档案</div>
      <div class="kp-profile-row"><span>言灵</span><b>{{ profile.yanling }}</b></div>
      <div class="kp-profile-row"><span>宿舍</span><b>{{ profile.dorm }}</b></div>
      <div class="kp-profile-row"><span>行为积分</span><b class="kp-gold-text">{{ profile.points }}</b></div>
    </div>

    <!-- MVU 联动状态 -->
    <div v-if="mvuRows.length" class="kp-set-section">
      <div class="kp-set-title"><KpIcon i="rss" /> 当前状态 <small style="font-weight:400;color:var(--kp-text-faint)">MVU 联动</small></div>
      <div v-for="row in mvuRows" :key="row.label" class="kp-profile-row">
        <span><KpIcon :i="row.icon" style="margin-right:5px;color:var(--kp-ice)" />{{ row.label }}</span>
        <b style="text-align:right">{{ row.value }}</b>
      </div>
    </div>

    <!-- 好感度 (MVU) -->
    <div v-if="affinityRows.length" class="kp-set-section">
      <div class="kp-set-title"><KpIcon i="heart" /> 好感度</div>
      <div v-for="row in affinityRows" :key="row.name" class="kp-affinity-row">
        <span class="kp-affinity-name">{{ row.name }}</span>
        <div class="kp-affinity-bar">
          <div class="kp-affinity-fill" :style="{ width: row.value + '%' }"></div>
        </div>
        <span class="kp-affinity-num">{{ Math.round(row.value) }}</span>
      </div>
    </div>

    <div v-if="!mvuRows.length" class="kp-empty" style="padding-top: 6px">
      <KpIcon i="unplug" />
      未检测到 MVU 变量数据<br />显示静态档案
    </div>
  </div>
</template>

