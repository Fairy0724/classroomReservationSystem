<template>
  <nav class="nav-container">
    <div class="nav-wrapper">
      <div class="logo">
        <span class="logo-text">教室预约系统</span>
      </div>

      <div v-if="showSearch" class="search-bar">
        <input type="text" :value="keyword" :placeholder="searchPlaceholder"
          @input="$emit('update:keyword', $event.target.value)" @keyup.enter="$emit('search')" />
        <button class="search-btn" @click="$emit('search')">搜索</button>
      </div>

      <div class="nav-links">
        <!-- 登录未失效 -->
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">
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

            <RouterLink to="/my-reservations" class="nav-link">
              <el-icon>
                <Calendar />
              </el-icon> 我的预约
            </RouterLink>

            <!-- 仅教师角色显示审批管理 -->
            <RouterLink v-if="userStore.userInfo?.role === 'teacher'" to="/approval" class="nav-link">
              <el-icon>
                <Checked />
              </el-icon> 审批管理
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
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled, Calendar, User, Setting, SwitchButton, Checked, ArrowDown, OfficeBuilding
} from '@element-plus/icons-vue'

defineProps({
  keyword: {
    type: String,
    default: ''
  },
  showSearch: {
    type: Boolean,
    default: false
  },
  showClassroomLink: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: '搜索教室名称、位置...'
  }
})

defineEmits(['update:keyword', 'search'])

const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => !!userStore.token && !!userStore.userInfo)

const displayName = computed(() => {
  const info = userStore.userInfo
  return info?.realName || info?.real_name || info?.username || info?.userName || '用户'
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
})
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
