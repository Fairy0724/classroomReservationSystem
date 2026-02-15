<template>
  <AdminLayout :breadcrumb="breadcrumbText">
    <!-- 管理员首页（仅 /admin 显示） -->
    <div v-if="isAdminHome" class="content-wrapper">
      <!-- ========== 左侧图表区域 ========== -->
      <AdminDashboardCharts :pie-data="pieData" :bar-data="barData" :line-dates="lineDates" :line-values="lineValues"
        :hot-data="hotData" />

      <!-- ========== 右侧统计卡片 ========== -->
      <div class="stats-section">
        <div class="stat-card" style="--accent-color: #409EFF;">
          <div class="stat-icon">
            <el-icon :size="32">
              <School />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">教室数量</div>
            <div class="stat-value">{{ stats.classroomCount }}</div>
          </div>
        </div>

        <div class="stat-card" style="--accent-color: #E6A23C;">
          <div class="stat-icon">
            <el-icon :size="32">
              <UserFilled />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">用户数量</div>
            <div class="stat-value">{{ stats.userCount }}</div>
          </div>
        </div>

        <div class="stat-card" style="--accent-color: #67C23A;">
          <div class="stat-icon">
            <el-icon :size="32">
              <Calendar />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">教室预约</div>
            <div class="stat-value">{{ stats.reservationCount }}</div>
          </div>
        </div>

        <div class="stat-card" style="--accent-color: #909399;">
          <div class="stat-icon">
            <el-icon :size="32">
              <Check />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">待审批数</div>
            <div class="stat-value">{{ stats.pendingCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理员子页面（/admin/*） -->
    <router-view v-else />
  </AdminLayout>
</template>

<script setup>
/**
 * AdminView - 管理员首页
 * 
 * 功能说明：
 * 1. 左侧菜单导航
 * 2. 顶部面包屑 + 用户信息
 * 3. 统计卡片展示关键数据
 * 4. ECharts图表可视化
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import AdminDashboardCharts from '@/components/AdminDashboardCharts.vue'
import request from '@/utils/request'
import {
  School, Calendar, UserFilled, Check
} from '@element-plus/icons-vue'

// ==================== 状态管理 ====================
// 当前页面仅处理图表数据与统计

// ==================== 统计数据 ====================
const stats = ref({
  classroomCount: 0,    // 教室数量
  userCount: 0,        // 用户数量
  reservationCount: 0, // 预约数量
  pendingCount: 0      // 待审批数量
})

// ==================== 图表数据缓存（用于导出） ====================
const pieData = ref([])
const barData = ref([])
const lineDates = ref([])
const lineValues = ref([])
const hotData = ref([])

const route = useRoute()
const isAdminHome = computed(() => route.path === '/admin')
const breadcrumbText = computed(() => {
  const map = {
    '/admin': '系统首页',
    '/admin/classroom': '教室管理',
    '/admin/classroom-type': '教室类型',
    '/admin/teachers': '教师信息',
    '/admin/students': '学生信息',
    '/admin/profile': '个人信息',
    '/admin/feedback': '反馈信息',
    '/admin/notice': '系统公告'
  }
  return map[route.path] || '系统首页'
})

// ==================== 生命周期 ====================
const fetchDashboardData = async () => {
  const res = await request.get('/admin/dashboard')
  const data = res?.data || res

  // 统计卡片
  stats.value = {
    classroomCount: data?.stats?.classroomCount || 0,
    userCount: data?.stats?.userCount || 0,
    reservationCount: data?.stats?.reservationCount || 0,
    pendingCount: data?.stats?.pendingCount || 0
  }

  // 图表数据缓存（用于导出）
  pieData.value = data?.classroomTypeStats || []
  barData.value = data?.reservationTypeStats || []
  lineDates.value = data?.weeklyTrend?.dates || []
  lineValues.value = data?.weeklyTrend?.values || []
  hotData.value = data?.hotClassrooms || []

}

onMounted(() => {
  // 拉取真实数据并初始化图表
  fetchDashboardData()
})
</script>

<style scoped>
/* ==================== 主内容区域 ==================== */
.content-wrapper {
  display: flex;
  gap: 20px;
  height: 100%;
}

/* ==================== 统计卡片区域 ==================== */
.stats-section {
  width: 160px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent-color);
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1200px) {
  .stats-section {
    width: 140px;
  }
}

@media (max-width: 992px) {
  .content-wrapper {
    flex-direction: column;
  }

  .stats-section {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .stat-card {
    flex: 1;
    min-width: 140px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
