<template>
  <AdminLayout :breadcrumb="breadcrumbText">
    <!-- 管理员首页（仅 /admin 显示） -->
    <div v-if="isAdminHome" class="content-wrapper">
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

        <!-- 第三行：热门教室排行 -->
        <div class="chart-card full-width">
          <div class="chart-header">
            <h3 class="chart-title">热门教室预约次数排行</h3>
            <span class="chart-subtitle">统计维度：预约次数 TOP5</span>
          </div>
          <div ref="hotChartRef" class="chart-container line-chart"></div>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import * as echarts from 'echarts'
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

// ==================== 图表相关 ====================
const pieChartRef = ref(null)
const barChartRef = ref(null)
const lineChartRef = ref(null)
const hotChartRef = ref(null)
let pieChart = null
let barChart = null
let lineChart = null
let hotChart = null

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

/**
 * 初始化饼状图 - 教室类型分布
 */
const initPieChart = (data = []) => {
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
      data: data.length ? data : [{ value: 0, name: '暂无数据' }]
    }]
  }

  pieChart.setOption(option)
}

/**
 * 初始化柱状图 - 教室申请数量
 */
const initBarChart = (data = []) => {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)

  const categories = data.map(item => item.name || '未知')
  const values = data.map(item => item.value || 0)

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
      data: categories.length ? categories : ['暂无数据'],
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
      data: values.length ? values : [0],
      itemStyle: { borderRadius: [4, 4, 0, 0] }
    }]
  }

  barChart.setOption(option)
}

/**
 * 初始化折线图 - 近一周预约趋势
 */
const initLineChart = (dates = [], values = []) => {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)

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
      data: dates.length ? dates.map(item => {
        const d = new Date(item)
        if (Number.isNaN(d.getTime())) return item
        return `${d.getMonth() + 1}/${d.getDate()}`
      }) : ['暂无数据'],
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
      data: values.length ? values : [0],
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
 * 初始化热门教室排行 - 横向柱状图
 */
const initHotChart = (data = []) => {
  if (!hotChartRef.value) return
  hotChart = echarts.init(hotChartRef.value)

  const names = data.map(item => item.name || '未知')
  const values = data.map(item => item.value || 0)

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', top: '12%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    yAxis: {
      type: 'category',
      data: names.length ? names : ['暂无数据'],
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' }
    },
    series: [
      {
        type: 'bar',
        data: values.length ? values : [0],
        barWidth: 14,
        itemStyle: { color: '#5B9BD5', borderRadius: [0, 6, 6, 0] }
      }
    ]
  }

  hotChart.setOption(option)
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
  hotChart?.resize()
}

/**
 * 退出登录
 */
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

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

  // 图表数据
  initPieChart(data?.classroomTypeStats || [])
  initBarChart(data?.reservationTypeStats || [])
  initLineChart(data?.weeklyTrend?.dates || [], data?.weeklyTrend?.values || [])
  initHotChart(data?.hotClassrooms || [])
}

onMounted(() => {
  // 监听窗口变化
  window.addEventListener('resize', handleResize)

  // 拉取真实数据并初始化图表
  fetchDashboardData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  lineChart?.dispose()
  hotChart?.dispose()
})
</script>

<style scoped>
/* ==================== 主内容区域 ==================== */
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
