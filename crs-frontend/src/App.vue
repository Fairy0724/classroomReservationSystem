<template>
  <div id="app">
    <!-- 登录页面不需要Layout，其他页面使用Layout -->
    <router-view v-slot="{ Component, route }">
      <Layout v-if="route.name !== 'Login'">
        <component :is="Component" />
      </Layout>
      <component v-else :is="Component" />
    </router-view>
  </div>
</template>

<script setup>
import Layout from './components/Layout.vue';
</script>

<style></style>