<template>
  <div id="app">
    <!-- 布局组件：可放导航、页脚 -->
    <Layout>
      <router-view />
    </Layout>
  </div>
</template>

<script setup>
import Layout from './components/Layout.vue';
</script>

<style></style>