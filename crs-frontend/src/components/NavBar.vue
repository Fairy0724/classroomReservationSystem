<template>
  <nav class="nav-container">
    <div class="nav-wrapper">
      <div class="logo">
        <span class="logo-text">教室预约系统</span>
      </div>

      <div v-if="showSearch" class="search-bar">
        <input type="text" :value="searchValue" :placeholder="searchPlaceholder" @input="handleInput"
          @keyup.enter="handleSearch" />
        <button class="search-btn" @click="handleSearch">搜索</button>
      </div>

      <div class="nav-links">
        <RouterLink v-if="showHomeLink" to="/" class="nav-link">
          <el-icon>
            <HomeFilled />
          </el-icon> 首页
        </RouterLink>

        <template v-if="isLoggedIn">
          <RouterLink v-if="showClassroomLink" to="/classrooms" class="nav-link">
            <el-icon>
              <OfficeBuilding />
            </el-icon> 教室列表
          </RouterLink>

          <RouterLink v-if="showMyReservationsLink" to="/my-reservations" class="nav-link">
            <el-icon>
              <Calendar />
            </el-icon> 我的预约
          </RouterLink>

          <RouterLink to="/messages" class="nav-link message-link">
            <el-icon>
              <Bell />
            </el-icon> 消息提醒
            <!-- 未读数量徽标 -->
            <span v-if="unreadCount > 0" class="unread-badge" aria-label="未读数量">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </RouterLink>

          <!-- 仅教师角色显示审批管理 -->
          <RouterLink v-if="showApprovalLink && userStore.userInfo?.role === 'teacher'" to="/approval"
            class="nav-link approval-link">
            <el-icon>
              <Checked />
            </el-icon> 审批管理
            <span v-if="pendingApprovalCount > 0" class="unread-badge" aria-label="待审批数量">
              {{ pendingApprovalCount > 99 ? '99+' : pendingApprovalCount }}
            </span>
          </RouterLink>

          <!-- 用户信息下拉菜单 -->
          <el-dropdown trigger="click">
            <div class="user-dropdown">
              <el-icon>
                <User />
              </el-icon>
              <span class="user-name">{{ displayName }}</span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">
                  <el-icon>
                    <User />
                  </el-icon> 个人中心
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <template v-else>
          <RouterLink to="/login" class="nav-link login-btn">
            <el-icon>
              <User />
            </el-icon> 登录
          </RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import {
  HomeFilled, Calendar, User, Setting, SwitchButton, Checked, ArrowDown, OfficeBuilding, Bell
} from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  keyword: {
    type: String,
    default: ''
  },
  showHomeLink: {
    type: Boolean,
    default: true
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  showClassroomLink: {
    type: Boolean,
    default: true
  },
  showMyReservationsLink: {
    type: Boolean,
    default: true
  },
  // 是否显示审批管理链接(仅教师角色可见)
  showApprovalLink: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: '搜索教室名称、位置...'
  }
})

const emit = defineEmits(['update:modelValue', 'update:keyword', 'search'])

const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)
const pendingApprovalCount = ref(0)
let unreadTimer = null
// WebSocket 运行时状态
let ws = null
let wsHeartbeatTimer = null
let wsReconnectTimer = null
let wsStopped = false

const isLoggedIn = computed(() => !!userStore.token && !!userStore.userInfo)

const displayName = computed(() => {
  const info = userStore.userInfo
  return info?.realName || info?.real_name || info?.username || info?.userName || '用户'
})

const searchValue = computed(() => {
  return props.modelValue || props.keyword || ''
})

onMounted(async () => {
  wsStopped = false

  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
    }
  }

  if (isLoggedIn.value) {
    await fetchNavBadges()
    unreadTimer = window.setInterval(fetchNavBadges, 30000)
    connectWs()
  }
})

onUnmounted(() => {
  wsStopped = true

  if (unreadTimer) {
    window.clearInterval(unreadTimer)
    unreadTimer = null
  }

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

const stopWsHeartbeat = () => {
  if (wsHeartbeatTimer) {
    window.clearInterval(wsHeartbeatTimer)
    wsHeartbeatTimer = null
  }
}

// 生成 WebSocket 连接地址：
// - 若配置了绝对 API 地址，按该地址的主机名拼接 ws/wss
// - 否则走同源地址（便于本地代理和生产同域部署）
const buildWsUrl = () => {
  const token = userStore.token || localStorage.getItem('token') || ''
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
  // 避免重复连接，且组件卸载后不再重连
  if (wsStopped || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  const url = buildWsUrl()
  if (!url) return

  ws = new WebSocket(url)

  ws.onopen = () => {
    // 心跳：每 30 秒发送 ping，服务端回 pong
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
      // 约定事件：message:new，表示有新消息入库
      if (payload?.event === 'message:new') {
        await fetchNavBadges()
      }
    } catch {
      // 非 JSON 消息忽略
    }
  }

  ws.onclose = () => {
    stopWsHeartbeat()
    ws = null

    if (wsStopped) return
    // 固定间隔重连（3 秒）
    if (wsReconnectTimer) window.clearTimeout(wsReconnectTimer)
    wsReconnectTimer = window.setTimeout(() => {
      connectWs()
    }, 3000)
  }

  ws.onerror = () => {
    // 交由 onclose 统一重连
  }
}

const fetchUnreadCount = async () => {
  try {
    const res = await request.get('/messages/unread-count')
    const count = Number(res?.unreadCount ?? res?.data?.unreadCount ?? res ?? 0)
    unreadCount.value = Number.isFinite(count) ? count : 0
  } catch {
    unreadCount.value = 0
  }
}

const fetchPendingApprovalCount = async () => {
  if (userStore.userInfo?.role !== 'teacher') {
    pendingApprovalCount.value = 0
    return
  }

  try {
    const res = await request.get('/approvals/stats')
    const pending = Number(res?.data?.pending ?? 0)
    pendingApprovalCount.value = Number.isFinite(pending) ? pending : 0
  } catch {
    pendingApprovalCount.value = 0
  }
}

const fetchNavBadges = async () => {
  await Promise.all([fetchUnreadCount(), fetchPendingApprovalCount()])
}
// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/login')
  } catch {
    // 用户取消
  }
}

const handleSearch = () => {
  const value = String(searchValue.value || '').trim()
  if (!value) return
  router.push({ path: '/classrooms', query: { keyword: value } })
  // 兼容已有页面的监听
  try {
    // @ts-ignore
    emit('search')
  } catch {
    // ignore
  }
}

const handleInput = (event) => {
  const value = event?.target?.value ?? ''
  emit('update:modelValue', value)
  emit('update:keyword', value)
}
</script>

<style scoped>
.nav-container {
  background: #fff;
  border-bottom: 1px solid #eef2f7;
}

.nav-wrapper {
  width: 90%;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.logo-text {
  font-size: 24px;
  font-weight: 600;
  /* logo 颜色 */
  color: #22c55e;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.search-bar input {
  border: none;
  background: transparent;
  outline: none;
  width: 220px;
}

.search-btn {
  border: none;
  color: #4b5563;
  padding: 6px 14px;
  /* border-radius: 999px; */
  cursor: pointer;
}

/* hover 效果 */
.search-btn:hover {
  color: #22c55e;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4b5563;
  text-decoration: none;
  /* 上下 左右内边距 */
  padding: 4px 6px;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.3s;
  text-decoration: none;
}

.message-link {
  position: relative;
  padding-right: 14px;
}

.approval-link {
  position: relative;
  padding-right: 14px;
}

.message-link .unread-badge {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
}

.approval-link .unread-badge {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
}

.login-btn {
  background-color: #22c55e;
  color: #fff;
}

.user-name {
  font-weight: 500;
  color: #1f2937;
}

.user-dropdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #1f2937;
}
</style>
