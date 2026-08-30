/**
 * 《龙族》卡塞尔学院 · 论坛+通讯手机
 * 入口: 注入宿主页面 (酒馆助手脚本 iframe → window.parent.document)
 *       或挂载在当前文档 (demo / 前端界面)
 */
import { createApp } from 'vue';
import themeCss from './styles/theme.css?inline';
import App from './App.vue';
import { env, hostDocument } from './env.js';
import { log } from './store.js';

const CONTAINER_ID = 'kassel-phone-root';
const STYLE_ID = 'kassel-phone-style';
const FA_ID = 'kassel-phone-fa';
const FA_URL = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css';

function injectStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = themeCss;
  doc.head.appendChild(style);
}

function injectFontAwesome(doc) {
  if (doc.getElementById(FA_ID)) return;
  const link = doc.createElement('link');
  link.id = FA_ID;
  link.rel = 'stylesheet';
  link.href = FA_URL;
  doc.head.appendChild(link);
}

function boot() {
  env.detect();
  const doc = hostDocument();

  injectStyle(doc);
  injectFontAwesome(doc);

  // 防重复实例 (脚本重载时移除旧容器)
  const existing = doc.getElementById(CONTAINER_ID);
  if (existing) existing.remove();

  const container = doc.createElement('div');
  container.id = CONTAINER_ID;
  (doc.body || doc.documentElement).appendChild(container);

  try {
    createApp(App).mount(container);
    log(`挂载完成 (${env.mock ? '演示模式' : '酒馆环境'})`);
  } catch (e) {
    console.error('[卡塞尔论坛] 挂载失败:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
