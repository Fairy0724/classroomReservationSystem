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
import { ElMessage, ElMessageBox } from 'element-plus'
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

const isLoggedIn = computed(() => !!userStore.token && !!userStore.userInfo)

const displayName = computed(() => {
  const info = userStore.userInfo
  return info?.realName || info?.real_name || info?.username || info?.userName || '用户'
})

const searchValue = computed(() => {
  return props.modelValue || props.keyword || ''
})

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
      ElMessage.error('登录已过期，请重新登录')
    }
  }

  if (isLoggedIn.value) {
    await fetchNavBadges()
    unreadTimer = window.setInterval(fetchNavBadges, 30000)
  }
})

onUnmounted(() => {
  if (unreadTimer) {
    window.clearInterval(unreadTimer)
    unreadTimer = null
  }
})

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
