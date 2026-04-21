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
            <option value="approval">审批结果</option>
            <option value="activity_reminder">活动提醒</option>
            <option value="system_notice">系统通知</option>
          </select>
          <button class="btn" @click="fetchMessages">刷新</button>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-left">
          <button class="btn" @click="toggleSelect">
            {{ selectionMode ? '取消选择' : '选择' }}
          </button>
          <button v-if="selectionMode" class="btn" @click="toggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
          <button class="btn danger" :disabled="!selectionMode" @click="handleDelete">删除</button>
        </div>
        <span class="hint">共 {{ messages.length }} 条</span>
      </div>

      <div class="message-list">
        <div v-if="!messages.length" class="empty">暂无消息</div>
        <div v-for="item in messages" :key="item.id" class="message-item"
          :class="{ unread: !item.isRead, selectable: selectionMode }" @click="handleItemClick(item)">
          <!-- 未读红点：仅在未读时显示 -->
          <span v-if="!item.isRead" class="unread-badge" aria-label="未读"></span>
          <label v-if="selectionMode" class="checkbox" @click.stop>
            <input type="checkbox" :value="item.id" v-model="selectedIds" />
          </label>
          <div class="message-body">
            <div class="message-meta">
              <span class="type" :class="item.type">{{ formatType(item.type) }}</span>
              <span class="time">{{ formatTime(item.sendTime) }}</span>
            </div>
            <div class="title">{{ item.title }}</div>
            <div class="summary">{{ item.summary }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import request from '@/utils/request'

const router = useRouter()
const messages = ref([])
const selectedIds = ref([])
const filterStatus = ref('')
const filterType = ref('')
const selectionMode = ref(false)
// 是否已全选（用于按钮文案和逻辑分支）
const isAllSelected = computed(() => {
  if (!messages.value.length) return false
  return selectedIds.value.length === messages.value.length
})


const page = ref(1)
const limit = ref(50)
// WebSocket 运行时状态
let ws = null
let wsHeartbeatTimer = null
let wsReconnectTimer = null
let wsStopped = false

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
// 停止 WebSocket 心跳定时器
const stopWsHeartbeat = () => {
  if (wsHeartbeatTimer) {
    window.clearInterval(wsHeartbeatTimer)
    wsHeartbeatTimer = null
  }
}

const buildWsUrl = () => {
  // token 放在查询参数中，服务端在握手阶段进行 JWT 校验
  const token = localStorage.getItem('token') || ''
  if (!token) return ''

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    const baseUrl = new URL(apiBase)
    const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${baseUrl.host}/ws?token=${encodeURIComponent(token)}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
}

const connectWs = () => {
  // 防止重复连接；组件销毁后不再重连
  if (wsStopped || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  const url = buildWsUrl()
  if (!url) return

  ws = new WebSocket(url)

  ws.onopen = () => {
    // 心跳：每 30 秒发送 ping，服务端返回 pong
    stopWsHeartbeat()
    wsHeartbeatTimer = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30000)
  }

  ws.onmessage = async (event) => {
    const text = String(event?.data || '')
    if (text === 'pong') return

    try {
      const payload = JSON.parse(text)
      // 约定事件：message:new，表示后端已写入新消息
      if (payload?.event === 'message:new') {
        await fetchMessages()
      }
    } catch {
      // 非 JSON 消息忽略
    }
  }

  ws.onclose = () => {
    stopWsHeartbeat()
    ws = null

    if (wsStopped) return
    // 固定间隔重连，避免网络抖动导致实时能力失效
    if (wsReconnectTimer) window.clearTimeout(wsReconnectTimer)
    wsReconnectTimer = window.setTimeout(() => {
      connectWs()
    }, 3000)
  }

  ws.onerror = () => {
    // 交由 onclose 统一重连
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
    approval: '审批结果',
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
  // 优先展示内容，避免审批结果被固定模板覆盖
  if (content) return content.slice(0, 120)
  // if (type === 'approval') {
  //   const status = title.includes('驳回') ? '驳回' : '通过'
  //   return `您的${title}已${status}`
  // }
  // if (type === 'activity_reminder') {
  //   const match = content.match(/\d{4}-\d{2}-\d{2}\s*\d{1,2}:\d{2}/)
  //   const timeText = match ? match[0] : '指定时间'
  //   return `您的${title}将于${timeText}开始`
  // }
  return '暂无摘要'
}

const toggleSelect = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedIds.value = []
  }
}

// 全选/取消全选：仅在选择模式下生效
const toggleSelectAll = () => {
  if (!messages.value.length) return
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = messages.value.map(item => item.id)
  }
}

const handleItemClick = (item) => {
  if (selectionMode.value) {
    const current = new Set(selectedIds.value)
    if (current.has(item.id)) current.delete(item.id)
    else current.add(item.id)
    selectedIds.value = Array.from(current)
    return
  }
  router.push({ path: `/messages/${item.id}` })
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
  wsStopped = false
  fetchMessages()
  connectWs()
})

onUnmounted(() => {
  wsStopped = true
  stopWsHeartbeat()

  if (wsReconnectTimer) {
    window.clearTimeout(wsReconnectTimer)
    wsReconnectTimer = null
  }

  if (ws) {
    ws.close()
    ws = null
  }
})
</script>

<style scoped>
.message-center-page {
  min-height: 100vh;
  background: #f0f4f8;
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

.action-left {
  display: flex;
  gap: 10px;
  align-items: center;
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
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.message-item.selectable {
  cursor: default;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item.unread {
  background: #f8fafc;
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

.type.activity_reminder {
  background: #fef3c7;
  color: #92400e;
}

.type.system_notice {
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


.unread-badge {
  position: absolute;
  top: 10px;
  right: 14px;
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
