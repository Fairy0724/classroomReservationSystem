<script setup>
/**
 * 占位页面（用于暂未实现的功能路由）
 * 说明：避免路由空白，提高可用性，后续可替换为真实页面
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta?.title || '功能页面')
</script>

<template>
  <div class="placeholder-container">
    <h1>{{ title }}</h1>
    <p>该功能正在开发中，后续将对接真实业务。</p>
  </div>
</template>

<style scoped>
.placeholder-container {
  max-width: 900px;
  margin: 60px auto;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.placeholder-container h1 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 16px;
}

.placeholder-container p {
  color: #909399;
}
</style>
