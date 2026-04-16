<template>
  <div class="admin-layout">
    <!-- 左侧菜单栏（公用） -->
    <aside class="sidebar">
      <div class="logo-section">
        <span class="logo-text">教室预约系统</span>
      </div>

      <el-menu :default-active="activeMenu" :default-openeds="['info-manage', 'user-manage']" class="sidebar-menu"
        background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF" :router="true">
        <el-menu-item index="/admin">
          <el-icon>
            <HomeFilled />
          </el-icon>
          <span>系统首页</span>
        </el-menu-item>

        <el-sub-menu index="info-manage">
          <template #title>
            <el-icon>
              <Document />
            </el-icon>
            <span>信息管理</span>
          </template>
          <el-menu-item index="/admin/classroom">
            <el-icon>
              <School />
            </el-icon>
            <span>教室信息</span>
          </el-menu-item>
          <el-menu-item index="/admin/course-schedule">
            <el-icon>
              <Document />
            </el-icon>
            <span>课程管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/classroom-type">
            <el-icon>
              <Grid />
            </el-icon>
            <span>教室类型</span>
          </el-menu-item>
          <!-- <el-menu-item index -->
          <el-menu-item index="/admin/notice">
            <el-icon>
              <Bell />
            </el-icon>
            <span>系统公告</span>
          </el-menu-item>
          <el-menu-item index="/admin/reservation-history">
            <el-icon>
              <Calendar />
            </el-icon>
            <span>历史预约</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="user-manage">
          <template #title>
            <el-icon>
              <User />
            </el-icon>
            <span>用户管理</span>
          </template>
          <el-menu-item index="/admin/teachers">
            <el-icon>
              <Avatar />
            </el-icon>
            <span>教师信息</span>
          </el-menu-item>
          <el-menu-item index="/admin/students">
            <el-icon>
              <UserFilled />
            </el-icon>
            <span>学生信息</span>
          </el-menu-item>
          <el-menu-item index="/admin/profile">
            <el-icon>
              <Avatar />
            </el-icon>
            <span>个人信息</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 右侧主区域（公用） -->
    <div class="main-area">
      <header class="top-header">
        <div class="header-left">
          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="`${item.path}-${index}`" :to="item.to">
              {{ item.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="user-info">
              <el-avatar :size="36" class="user-avatar">
                {{ userStore.userInfo?.username?.charAt(0) || '管' }}
              </el-avatar>
              <span class="user-name">{{ userStore.userInfo?.username || '管理员' }}</span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminLayout - 管理后台公用布局
 * - 左侧菜单 + 顶部导航
 * - 通过 slot 注入页面主体内容
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import {
  HomeFilled,
  Document,
  School,
  Grid,
  Bell,
  Calendar,
  User,
  UserFilled,
  Avatar,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const menuTree = [
  {
    group: '信息管理',
    children: [
      { path: '/admin/classroom', label: '教室信息' },
      { path: '/admin/course-schedule', label: '课程管理' },
      { path: '/admin/classroom-type', label: '教室类型' },
      { path: '/admin/notice', label: '系统公告' },
      { path: '/admin/reservation-history', label: '历史预约' }
    ]
  },
  {
    group: '用户管理',
    children: [
      { path: '/admin/teachers', label: '教师信息' },
      { path: '/admin/students', label: '学生信息' },
      { path: '/admin/profile', label: '个人信息' }
    ]
  }
]

const normalizePath = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return '/'
  const normalized = raw.replace(/\/+$/, '')
  return normalized || '/'
}

const findBreadcrumbMeta = (path) => {
  for (const groupItem of menuTree) {
    for (const page of groupItem.children) {
      if (path === page.path) {
        return { group: groupItem.group, label: page.label }
      }
      if (path.startsWith(`${page.path}/`)) {
        return {
          group: groupItem.group,
          label: String(route.meta?.title || page.label || '详情').trim()
        }
      }
    }
  }
  return null
}

const breadcrumbItems = computed(() => {
  const currentPath = normalizePath(route.path)

  if (currentPath === '/admin') {
    return [{ label: '系统首页', path: '/admin', to: { path: '/admin' } }]
  }

  const items = []
  const meta = findBreadcrumbMeta(currentPath)

  if (meta?.group) {
    items.push({ label: meta.group, path: `${currentPath}-group` })
  }

  const currentLabel = meta?.label || String(route.meta?.title || '系统首页').trim()
  items.push({ label: currentLabel, path: currentPath })
  return items
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
/* 公用布局样式 */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f6fa;
}

.sidebar {
  width: 220px;
  background: #304156;
  color: #fff;
  flex-shrink: 0;
}

.logo-section {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* .logo-img {
  width: 28px;
  height: 28px;
  margin-right: 10px;
} */

.logo-text {
  font-size: 20px;
  font-weight: 600;
}

.sidebar-menu {
  border-right: none;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.main-content {
  padding: 24px;
}
</style>
