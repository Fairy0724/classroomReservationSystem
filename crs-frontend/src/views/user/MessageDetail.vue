<template>
  <div class="message-detail-page">
    <NavBar :show-search="false" :show-classroom-link="true" :show-my-reservations-link="true" />

    <div class="container">
      <div class="header">
        <div>
          <h2>消息详情</h2>
          <p class="subtitle">查看消息完整内容</p>
        </div>
        <button class="btn" @click="goBack">返回</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <div v-else-if="message" class="detail-card">
        <div class="detail-header">
          <h3>{{ message.title }}</h3>
          <span class="time">{{ formatTime(message.sendTime) }}</span>
        </div>
        <div class="type">{{ formatType(message.type) }}</div>
        <div class="content">{{ message.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const message = ref(null)
const loading = ref(false)
const error = ref('')

const normalizeMessage = (item) => {
  return {
    id: item.message_id ?? item.messageId ?? item.id,
    type: item.type || 'system_notice',
    title: item.title || '系统通知',
    content: item.content || '',
    sendTime: item.send_time || item.sendTime || item.createTime || '',
    isRead: String(item.is_read ?? item.isRead ?? 0) === '1'
  }
}

const formatType = (type) => {
  const map = {
    approval_result: '审批结果',
    activity_reminder: '活动提醒',
    system_notice: '系统通知',
    approval: '审批结果'
  }
  return map[type] || '系统通知'
}

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

const fetchMessageDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get(`/messages/${route.params.id}`)
    const detail = res?.data || res
    const normalized = normalizeMessage(detail || {})
    message.value = normalized

    if (!normalized.isRead) {
      await request.put(`/messages/${normalized.id}/read`)
    }
  } catch {
    error.value = '消息详情加载失败'
    ElMessage.error('消息详情加载失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/messages')
}

onMounted(() => {
  fetchMessageDetail()
})
</script>

<style scoped>
.message-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
  font-size: 22px;
  color: #1f2937;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #374151;
}

.detail-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
}

.time {
  color: #6b7280;
  font-size: 12px;
}

.type {
  margin: 10px 0;
  color: #22c55e;
  font-size: 13px;
}

.content {
  line-height: 1.7;
  color: #374151;
  white-space: pre-wrap;
}

.loading,
.error {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}
</style>
