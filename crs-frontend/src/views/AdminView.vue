<template>
  <!-- 
    管理员页面 - 仿照参考图设计
    包含：左侧菜单 + 顶部导航 + 主内容区（统计卡片+图表）
  -->
  <div class="admin-layout">
    <!-- ========== 左侧菜单栏 ========== -->
    <aside class="sidebar">
      <!-- Logo区域 -->
      <div class="logo-section">
        <img src="../assets/images/logo.png" alt="Logo" class="logo-img" />
        <span class="logo-text">教室预约系统</span>
      </div>

      <!-- 菜单列表 -->
      <el-menu :default-active="activeMenu" :default-openeds="['info-manage', 'user-manage']" class="sidebar-menu"
        background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF" :router="true">
        <!-- 系统首页 -->
        <el-menu-item index="/admin">
          <el-icon>
            <HomeFilled />
          </el-icon>
          <span>系统首页</span>
        </el-menu-item>

        <!-- 信息管理 -->
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
          <el-menu-item index="/admin/classroom-type">
            <el-icon>
              <Grid />
            </el-icon>
            <span>教室类型</span>
          </el-menu-item>
          <el-menu-item index="/admin/reservation">
            <el-icon>
              <Calendar />
            </el-icon>
            <span>预约申请</span>
          </el-menu-item>
          <el-menu-item index="/admin/feedback">
            <el-icon>
              <ChatDotRound />
            </el-icon>
            <span>反馈信息</span>
          </el-menu-item>
          <el-menu-item index="/admin/notice">
            <el-icon>
              <Bell />
            </el-icon>
            <span>系统公告</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 用户信息 -->
        <el-sub-menu index="user-manage">
          <template #title>
            <el-icon>
              <User />
            </el-icon>
            <span>用户信息</span>
          </template>
          <el-menu-item index="/admin/users">
            <el-icon>
              <UserFilled />
            </el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/teachers">
            <el-icon>
              <Avatar />
            </el-icon>
            <span>教师信息</span>
          </el-menu-item>
          <el-menu-item index="/admin/admins">
            <el-icon>
              <Setting />
            </el-icon>
            <span>管理员信息</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- ========== 右侧主区域 ========== -->
    <div class="main-area">
      <!-- 顶部导航栏 -->
      <header class="top-header">
        <div class="header-left">
          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>系统首页</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 用户信息 -->
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
                  </el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主内容区域 -->
      <main class="main-content">
        <div class="content-wrapper">
          <!-- ========== 左侧图表区域 ========== -->
          <div class="charts-section">
            <!-- 第一行：饼图 + 柱状图 -->
            <div class="charts-row">
              <!-- 饼状图 - 教室类型分布 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3 class="chart-title">不同类型教室数量分布饼状图</h3>
                  <span class="chart-subtitle">统计维度：教室分类</span>
                </div>
                <div ref="pieChartRef" class="chart-container"></div>
              </div>

              <!-- 柱状图 - 预约申请数量 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3 class="chart-title">不同类型教室申请数量柱状图</h3>
                  <span class="chart-subtitle">统计维度：教室分类</span>
                </div>
                <div ref="barChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 第二行：折线图 -->
            <div class="chart-card full-width">
              <div class="chart-header">
                <h3 class="chart-title">近一周每日教室预约次数折线图</h3>
                <span class="chart-subtitle">统计维度：教室每日预约次数</span>
              </div>
              <div ref="lineChartRef" class="chart-container line-chart"></div>
            </div>
          </div>

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
      </main>
    </div>
  </div>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import * as echarts from 'echarts'
import {
  HomeFilled, Document, School, Grid, Calendar,
  ChatDotRound, Bell, User, UserFilled, Avatar,
  Setting, ArrowDown, SwitchButton, Check
} from '@element-plus/icons-vue'

// ==================== 状态管理 ====================
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// 当前激活菜单
const activeMenu = computed(() => route.path)

// ==================== 统计数据 ====================
const stats = ref({
  classroomCount: 10,    // 教室数量
  userCount: 156,        // 用户数量
  reservationCount: 89,  // 预约数量
  pendingCount: 5        // 待审批数量
})

// ==================== 图表相关 ====================
const pieChartRef = ref(null)
const barChartRef = ref(null)
const lineChartRef = ref(null)
let pieChart = null
let barChart = null
let lineChart = null

/**
 * 初始化饼状图 - 教室类型分布
 */
const initPieChart = () => {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#666' }
    },
    color: ['#5B9BD5', '#70AD47', '#FFC000', '#ED7D31', '#7030A0', '#00B0F0', '#C55A11', '#9E480E'],
    series: [{
      type: 'pie',
      radius: ['30%', '60%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}-{c}',
        fontSize: 11
      },
      labelLine: { show: true, length: 10, length2: 10 },
      data: [
        { value: 3, name: '普通教室' },
        { value: 2, name: '多媒体教室' },
        { value: 2, name: '实验室' },
        { value: 1, name: '会议室' },
        { value: 1, name: '报告厅' },
        { value: 1, name: '自习室' }
      ]
    }]
  }

  pieChart.setOption(option)
}

/**
 * 初始化柱状图 - 教室申请数量
 */
const initBarChart = () => {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['普通教室', '多媒体', '实验室', '会议室', '报告厅', '自习室'],
      axisLabel: {
        fontSize: 11,
        interval: 0,
        rotate: 0
      },
      axisLine: { lineStyle: { color: '#ddd' } }
    },
    yAxis: {
      type: 'value',
      name: '申请数量',
      nameTextStyle: { fontSize: 11, color: '#999' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: [{
      type: 'bar',
      barWidth: '50%',
      data: [
        { value: 28, itemStyle: { color: '#8B4513' } },
        { value: 6, itemStyle: { color: '#DEB887' } },
        { value: 8, itemStyle: { color: '#F4A460' } },
        { value: 12, itemStyle: { color: '#D2B48C' } },
        { value: 25, itemStyle: { color: '#CD853F' } },
        { value: 10, itemStyle: { color: '#A0522D' } }
      ],
      itemStyle: { borderRadius: [4, 4, 0, 0] }
    }]
  }

  barChart.setOption(option)
}

/**
 * 初始化折线图 - 近一周预约趋势
 */
const initLineChart = () => {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)

  // 获取近7天日期
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(`${date.getMonth() + 1}/${date.getDate()}`)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      name: '次数',
      nameTextStyle: { fontSize: 11, color: '#999' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      data: [1, 3, 0, 2, 1, 2, 1],
      lineStyle: { color: '#5B9BD5', width: 2 },
      itemStyle: {
        color: '#5B9BD5',
        borderColor: '#fff',
        borderWidth: 2
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(91, 155, 213, 0.3)' },
          { offset: 1, color: 'rgba(91, 155, 213, 0.05)' }
        ])
      },
      // 标记最高点和最低点
      markPoint: {
        data: [
          { type: 'max', name: '最大值' },
          { type: 'min', name: '最小值' }
        ],
        symbolSize: 40,
        label: { fontSize: 10 }
      },
      // 平均线
      markLine: {
        data: [{ type: 'average', name: '平均值' }],
        lineStyle: { color: '#E6A23C', type: 'dashed' },
        label: { fontSize: 10 }
      }
    }]
  }

  lineChart.setOption(option)
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
}

/**
 * 退出登录
 */
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化图表
  initPieChart()
  initBarChart()
  initLineChart()

  // 监听窗口变化
  window.addEventListener('resize', handleResize)

  // TODO: 从后端获取统计数据
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  lineChart?.dispose()
})
</script>

<style scoped>
/* ==================== 整体布局 ==================== */
.admin-layout {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

/* ==================== 左侧菜单栏 ==================== */
.sidebar {
  width: 200px;
  background-color: #304156;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo-section {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background-color: #263445;
}

.logo-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  margin-right: 10px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

/* 菜单样式覆盖 */
:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu-item.is-active) {
  background-color: #409EFF !important;
  color: #fff !important;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: rgba(64, 158, 255, 0.2) !important;
}

/* ==================== 右侧主区域 ==================== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 顶部导航栏 ==================== */
.top-header {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  color: #fff;
  font-weight: 600;
}

.user-name {
  margin: 0 8px;
  font-size: 14px;
  color: #333;
}

/* ==================== 主内容区域 ==================== */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  height: 100%;
}

/* ==================== 图表区域 ==================== */
.charts-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.charts-row {
  display: flex;
  gap: 20px;
  flex: 1;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart-card.full-width {
  flex: none;
  height: 280px;
}

.chart-header {
  margin-bottom: 10px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.chart-subtitle {
  font-size: 12px;
  color: #999;
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.chart-container.line-chart {
  min-height: 200px;
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
  .charts-row {
    flex-direction: column;
  }

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
