<script setup>
// 测试Vue响应式数据
import { ref } from 'vue'
// 测试Element Plus组件和图标导入
import { ElButton, ElIcon } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { RouterLink } from 'vue-router'

const testTitle = ref('前端搭建成功测试')
</script>

<template>
  <div>
    <!-- 测试Vue基础语法 -->
    <h1>{{ testTitle }}</h1>
    <!-- 测试Element Plus组件 -->
    <el-button type="primary">测试Element按钮</el-button>
    <!-- 测试Element Plus图标 -->
    <el-icon style="font-size: 24px; margin-left: 10px">
      <Search />
    </el-icon>
    <router-link to="/test" style="margin-left: 10px">跳转到Test页面</router-link>
  </div>
</template>

