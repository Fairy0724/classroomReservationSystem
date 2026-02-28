<template>
  <!--
    通用分页器
    目标：统一系统分页样式，保持与公告列表一致
  -->
  <div v-if="total > 0" class="pagination">
    <span class="page-info">共 {{ total }} 条</span>
    <button class="page-btn" :disabled="page <= 1" @click="setPage(page - 1)">上一页</button>
    <span class="page-num">{{ page }} / {{ totalPages }}</span>
    <button class="page-btn" :disabled="page >= totalPages" @click="setPage(page + 1)">下一页</button>
  </div>
</template>

<script setup>
/**
 * AppPagination
 * - 统一分页显示样式
 * - 通过 v-model:page 与父组件同步页码
 * - 变更页码后触发 change 事件，便于父组件拉取数据
 */
import { computed } from 'vue'

const props = defineProps({
  // 总条数
  total: {
    type: Number,
    default: 0
  },
  // 当前页码
  page: {
    type: Number,
    default: 1
  },
  // 每页数量（用于计算总页数）
  pageSize: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:page', 'change'])

// 计算总页数，最小为 1
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

// 统一处理页码切换
const setPage = (nextPage) => {
  const safePage = Math.min(Math.max(nextPage, 1), totalPages.value)
  if (safePage === props.page) return
  // 先同步页码，再通知父组件刷新数据
  emit('update:page', safePage)
  emit('change', safePage)
}
</script>

<style scoped>
.pagination {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.page-info {
  color: #666;
  font-size: 12px;
}

.page-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.page-btn:disabled {
  cursor: not-allowed;
  color: #9ca3af;
}

.page-num {
  font-size: 12px;
  color: #4b5563;
}
</style>
