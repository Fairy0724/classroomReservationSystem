<template>
  <div class="message-center-page">
    <NavBar :show-search="false" :show-classroom-link="true" :show-my-reservations-link="true" />

    <div class="container">
      <div class="page-header">
        <div>
          <h2>消息通知</h2>
          <p class="subtitle">查看审批结果、活动提醒与系统通知</p>
        </div>
        <div class="filters">
          <select v-model="filterStatus">
            <option value="">全部状态</option>
            <option value="false">未读</option>
            <option value="true">已读</option>
          </select>
          <select v-model="filterType">
            <option value="">全部类型</option>
            <option value="approval_result">审批结果</option>
            <option value="activity_reminder">活动提醒</option>
            <option value="system_notice">系统通知</option>
          </select>
          <button class="btn" @click="fetchMessages">刷新</button>
        </div>
      </div>

      <div class="action-bar">
        <button class="btn danger" @click="handleDelete">删除</button>
        <span class="hint">共 {{ messages.length }} 条</span>
      </div>

      <div class="message-list">
        <div v-if="!messages.length" class="empty">暂无消息</div>
        <div v-for="item in messages" :key="item.id" class="message-item"
          :class="{ unread: !item.isRead, active: activeMessage?.id === item.id }" @click="openMessage(item)">
          <label class="checkbox" @click.stop>
            <input type="checkbox" :value="item.id" v-model="selectedIds" />
          </label>
          <div class="message-body">
            <div class="message-meta">
              <span class="type" :class="item.type">{{ formatType(item.type) }}</span>
              <span class="time">{{ formatTime(item.sendTime) }}</span>
              <span v-if="!item.isRead" class="unread-dot" aria-label="未读"></span>
            </div>
            <div class="title">{{ item.title }}</div>
            <div class="summary">{{ item.summary }}</div>
          </div>
        </div>
      </div>

      <div v-if="activeMessage" class="message-detail">
        <div class="detail-header">
          <h3>{{ activeMessage.title }}</h3>
          <span class="detail-time">{{ formatTime(activeMessage.sendTime) }}</span>
        </div>
        <div class="detail-type">{{ formatType(activeMessage.type) }}</div>
        <div class="detail-content">{{ activeMessage.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import request from '@/utils/request'

const messages = ref([])
const activeMessage = ref(null)
const selectedIds = ref([])
const filterStatus = ref('')
const filterType = ref('')


const page = ref(1)
const limit = ref(50)

// 刷新消息列表
const fetchMessages = async () => {
  try {
    const res = await request.get('/messages', {
      params: {
        type: filterType.value || undefined,
        isRead: filterStatus.value !== '' ? filterStatus.value : undefined,
        page: page.value,
        limit: limit.value
      }
    })
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    messages.value = list
      .map(item => {
        const normalized = normalizeMessage(item)
        return {
          ...normalized,
          summary: normalized.summary || buildSummary(normalized)
        }
      })
      .sort((a, b) => new Date(b.sendTime).getTime() - new Date(a.sendTime).getTime())
  } catch {
    ElMessage.error('消息同步失败，请重新登录后尝试')
  }
}

// 归一化消息格式（兼容后端不同接口返回的字段差异）
const normalizeMessage = (item) => {
  return {
    id: item.message_id ?? item.messageId ?? item.id,
    type: item.type || 'system_notice',
    title: item.title || '系统通知',
    content: item.content || '',
    sendTime: item.send_time || item.sendTime || item.createTime || '',
    isRead: String(item.is_read ?? item.isRead ?? 0) === '1',
    summary: item.summary || item.abstract || ''
  }
}

// 格式化消息类型显示
const formatType = (type) => {
  const map = {
    approval_result: '审批结果',
    activity_reminder: '活动提醒',
    system_notice: '系统通知'
  }
  return map[type] || '系统通知'
}

// 格式化时间显示
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

//  根据消息内容构建摘要（审批结果和活动提醒有特定格式，其他类型直接截取内容前60字符）
const buildSummary = (item) => {
  const type = item.type
  const title = item.title || '预约'
  const content = String(item.content || '')
  if (type === 'approval_result') {
    const status = content.includes('驳回') || title.includes('驳回') ? '驳回' : '通过'
    return `您的${title}已${status}`
  }
  if (type === 'activity_reminder') {
    const match = content.match(/\d{4}-\d{2}-\d{2}\s*\d{1,2}:\d{2}/)
    const timeText = match ? match[0] : '指定时间'
    return `您的${title}将于${timeText}开始`
  }
  return content ? content.slice(0, 60) : '暂无摘要'
}

// 打开消息详情并标记为已读
const openMessage = async (item) => {
  try {
    if (!item.content) {
      const res = await request.get(`/messages/${item.id}`)
      const detail = res?.data || res
      item.content = detail?.content || item.content
    }
    activeMessage.value = item
    if (!item.isRead) await markAsRead(item)
  } catch {
    ElMessage.error('详情加载异常，请重新点击')
  }
}

// 标记消息为已读
const markAsRead = async (item) => {
  try {
    await request.put(`/messages/${item.id}/read`)
    item.isRead = true
  } catch {
    ElMessage.error('消息状态更新失败，请稍后重试')
  }
}

// 删除选中消息
const handleDelete = async () => {
  if (!selectedIds.value.length) {
    ElMessage.warning('请选择需要删除的消息')
    return
  }
  try {
    await Promise.all(selectedIds.value.map(id => request.delete(`/messages/${id}`)))
    messages.value = messages.value.filter(item => !selectedIds.value.includes(item.id))
    if (activeMessage.value && selectedIds.value.includes(activeMessage.value.id)) {
      activeMessage.value = null
    }
    selectedIds.value = []
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('消息删除失败，请稍后重试')
  }
}

watch([filterStatus, filterType], () => {
  fetchMessages()
})

onMounted(() => {
  fetchMessages()
})
</script>

<style scoped>
.message-center-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  color: #1f2937;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filters select {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #374151;
}

.btn.danger {
  color: #b91c1c;
  border-color: #f3b4b4;
  background: #fff5f5;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.hint {
  color: #6b7280;
  font-size: 12px;
}

.message-list {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item.unread {
  background: #f8fafc;
}

.message-item.active {
  background: #eef9f1;
}

.checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.message-body {
  flex: 1;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.type {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #0f172a;
  background: #e2e8f0;
}

.type.approval {
  background: #dcfce7;
  color: #166534;
}

.type.activity {
  background: #fef3c7;
  color: #92400e;
}

.type.system {
  background: #e0f2fe;
  color: #075985;
}

.title {
  font-weight: 600;
  color: #1f2937;
}

.summary {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.empty {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}

.message-detail {
  margin-top: 18px;
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
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
}

.detail-time {
  color: #6b7280;
  font-size: 12px;
}

.detail-type {
  margin: 10px 0;
  color: #22c55e;
  font-size: 13px;
}

.detail-content {
  line-height: 1.7;
  color: #374151;
}
</style>
