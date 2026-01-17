<template>
  <div id="layout">
    <!-- 主内容区域 -->
    <main>
      <!-- 使用Vue Router 4.x推荐的插槽语法实现keep-alive -->
      <router-view v-slot="{ Component, route }">
        <keep-alive :max="10">
          <component :is="Component" v-if="route.meta.keepAlive" :key="route.fullPath" />
        </keep-alive>
        <!-- 不缓存的组件 -->
        <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'

defineOptions({
  name: 'LayoutPage',
})
</script>

<style scoped>
#layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

nav {
  font-size: 16px;
}

nav a {
  display: inline-block;
  padding: 10px 15px;
  color: #333;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

nav a:hover {
  background-color: #e0e0e0;
}

main {
  flex: 1;
  width: 100%;
  margin: 0 auto;
  background: #fff;
  min-height: 800px;
  box-sizing: border-box;
}

header {
  background: #fff;
  border-bottom: 1px solid #eee;
}

footer {
  background: #222;
  color: #fff;
  text-align: center;
  border-top: none;
  font-size: 15px;
  letter-spacing: 1px;
}
</style>
