import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // 配置插件
  plugins: [vue()],
  // 配置别名（@指向src目录）
  resolve: {
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 配置开发服务器
  server: {
    // 配置代理（解决跨域问题）
    proxy: {
      '/api': {
        // 代理目标地址后端服务器地址
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
