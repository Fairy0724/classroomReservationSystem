<template>
  <div class="notice-detail">
    <NavBar :show-search="false" />

    <div class="content">
      <div class="header">
        <h1>公告详情</h1>
        <p>查看系统公告的完整内容。</p>
      </div>

      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>

      <div v-else-if="detail" class="panel">
        <div class="panel-header">
          <h2>{{ detail.title }}</h2>
          <div class="meta">
            <span>发布时间：{{ formatTime(detail.publishTime) }}</span>
            <span>浏览量：{{ detail.viewCount }}</span>
            <span>有效期：{{ detail.expireTime || '长期有效' }}</span>
          </div>
        </div>
        <div class="panel-body">
          <p v-for="(line, index) in detailLines" :key="index">{{ line }}</p>
        </div>
        <div class="panel-actions">
          <button class="btn" @click="goBack">返回列表</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 公告详情（用户侧）
 * - 拉取公告详情并展示完整内容
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import NavBar from '@/components/NavBar.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const detail = ref(null)

const formatTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return String(time)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const detailLines = computed(() => {
  const text = String(detail.value?.content || '').trim()
  if (!text) return ['—']
  return text.split(/\n+/).map(line => line.trim()).filter(Boolean)
})

const normalizeDetail = (row) => {
  return {
    id: row.announcement_id ?? row.announcementId ?? row.id,
    title: row.title,
    content: row.content,
    publishTime: row.publish_time ?? row.publishTime,
    expireTime: row.expire_time ?? row.expireTime,
    isTop: Number(row.is_top ?? row.isTop ?? 0),
    viewCount: Number(row.view_count ?? row.viewCount ?? 0)
  }
}

const fetchDetail = async () => {
  const id = route.params.id
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    const res = await request.get(`/announcements/${id}`)
    detail.value = res?.data ? normalizeDetail(res.data) : null
  } catch (err) {
    error.value = '获取公告详情失败，请稍后再试'
    detail.value = null
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/notice')
}

onMounted(() => {
  fetchDetail()
})

watch(() => route.params.id, () => {
  fetchDetail()
})
</script>

<style scoped>
.notice-detail {
  min-height: 100vh;
  background: #f0f4f8;
}

.content {
  max-width: 1000px;
  margin: 32px auto;
  padding: 0 20px 40px;
}

.header h1 {
  margin: 0 0 8px;
}

.state {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
}

.state.error {
  color: #ef4444;
}

.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  padding: 24px;
}

.panel-header h2 {
  margin: 0 0 10px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #6b7280;
  font-size: 13px;
}

.panel-body {
  margin-top: 16px;
  color: #111827;
  line-height: 1.8;
}

.panel-body p {
  margin: 0 0 10px;
}

.panel-actions {
  margin-top: 20px;
}

.btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  border: none;
  background: #2ecc71;
  color: #fff;
  cursor: pointer;
}
</style>
