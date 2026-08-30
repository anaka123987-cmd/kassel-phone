import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// 构建目标: 单文件 IIFE (Vue 内联), 供酒馆助手脚本通过 <script src> 一行引用
export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'),
      name: 'KasselPhone',
      formats: ['iife'],
      fileName: () => 'kassel-phone.js',
    },
    minify: 'esbuild',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1024,
  },
});
