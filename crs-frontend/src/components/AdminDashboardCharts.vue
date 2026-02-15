<template>
  <div class="charts-section">
    <!-- 第一行：饼图 + 柱状图 -->
    <div class="charts-row">
      <!-- 饼状图 - 教室类型分布 -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">不同类型教室数量分布饼状图</h3>
            <span class="chart-subtitle">统计维度：教室分类</span>
          </div>
          <button class="export-btn" @click="exportPie">导出Excel</button>
        </div>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>

      <!-- 柱状图 - 预约申请数量 -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">不同类型教室申请数量柱状图</h3>
            <span class="chart-subtitle">统计维度：教室分类</span>
          </div>
          <button class="export-btn" @click="exportBar">导出Excel</button>
        </div>
        <div ref="barChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 第二行：折线图 -->
    <div class="chart-card full-width">
      <div class="chart-header">
        <div>
          <h3 class="chart-title">近一周每日教室预约次数折线图</h3>
          <span class="chart-subtitle">统计维度：教室每日预约次数</span>
        </div>
        <button class="export-btn" @click="exportLine">导出Excel</button>
      </div>
      <div ref="lineChartRef" class="chart-container line-chart"></div>
    </div>

    <!-- 第三行：热门教室排行 -->
    <div class="chart-card full-width">
      <div class="chart-header">
        <div>
          <h3 class="chart-title">热门教室预约次数排行</h3>
          <span class="chart-subtitle">统计维度：预约次数 TOP5</span>
        </div>
        <button class="export-btn" @click="exportHot">导出Excel</button>
      </div>
      <div ref="hotChartRef" class="chart-container line-chart"></div>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminDashboardCharts
 * - 专注于管理员首页 ECharts 渲染与导出逻辑
 * - 通过 props 接收后端数据，便于复用
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  pieData: {
    type: Array,
    default: () => []
  },
  barData: {
    type: Array,
    default: () => []
  },
  lineDates: {
    type: Array,
    default: () => []
  },
  lineValues: {
    type: Array,
    default: () => []
  },
  hotData: {
    type: Array,
    default: () => []
  }
})

// 图表 DOM 引用
const pieChartRef = ref(null)
const barChartRef = ref(null)
const lineChartRef = ref(null)
const hotChartRef = ref(null)

// 图表实例
let pieChart = null
let barChart = null
let lineChart = null
let hotChart = null

// ==================== 图表初始化 ==================== 
 // 配置饼图
const initPieChart = (data = []) => {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)


  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
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
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}-{c}', fontSize: 11 },
      labelLine: { show: true, length: 10, length2: 10 },
      data: data.length ? data : [{ value: 0, name: '暂无数据' }]
    }]
  })
}
// 配置柱状图
const initBarChart = (data = []) => {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)

  const categories = data.map(item => item.name || '未知')
  const values = data.map(item => item.value || 0)

  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories.length ? categories : ['暂无数据'],
      axisLabel: { fontSize: 11, interval: 0, rotate: 0 },
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
  })
}

const initLineChart = (dates = [], values = []) => {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)

  lineChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates.length
        ? dates.map(item => {
          const d = new Date(item)
          if (Number.isNaN(d.getTime())) return item
          return `${d.getMonth() + 1}/${d.getDate()}`
        })
        : ['暂无数据'],
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
      itemStyle: { color: '#5B9BD5', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(91, 155, 213, 0.3)' },
          { offset: 1, color: 'rgba(91, 155, 213, 0.05)' }
        ])
      },
      markPoint: {
        data: [
          { type: 'max', name: '最大值' },
          { type: 'min', name: '最小值' }
        ],
        symbolSize: 40,
        label: { fontSize: 10 }
      },
      markLine: {
        data: [{ type: 'average', name: '平均值' }],
        lineStyle: { color: '#E6A23C', type: 'dashed' },
        label: { fontSize: 10 }
      }
    }]
  })
}

const initHotChart = (data = []) => {
  if (!hotChartRef.value) return
  hotChart = echarts.init(hotChartRef.value)

  const names = data.map(item => item.name || '未知')
  const values = data.map(item => item.value || 0)

  hotChart.setOption({
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
  })
}

// ==================== 导出Excel（CSV） ====================
const downloadCsv = (filename, headers, rows) => {
  const escapeCell = (value) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const headerLine = headers.map(escapeCell).join(',')
  const bodyLines = rows.map(row => row.map(escapeCell).join(','))
  const csv = [headerLine, ...bodyLines].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportPie = () => {
  downloadCsv('教室类型分布', ['类型', '数量'], props.pieData.map(item => [item.name, item.value]))
}

const exportBar = () => {
  downloadCsv('类型预约数量', ['类型', '申请数量'], props.barData.map(item => [item.name, item.value]))
}

const exportLine = () => {
  downloadCsv('近一周预约趋势', ['日期', '预约次数'], props.lineDates.map((date, i) => [date, props.lineValues[i] ?? 0]))
}

const exportHot = () => {
  downloadCsv('热门教室排行', ['教室', '预约次数'], props.hotData.map(item => [item.name, item.value]))
}

// ==================== 生命周期 ====================
const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
  hotChart?.resize()
}

onMounted(() => {
  // 初次渲染图表
  initPieChart(props.pieData)
  initBarChart(props.barData)
  initLineChart(props.lineDates, props.lineValues)
  initHotChart(props.hotData)

  // 监听窗口变化，确保图表自适应
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  lineChart?.dispose()
  hotChart?.dispose()
})

// 当数据更新时，刷新图表
watch(
  () => [props.pieData, props.barData, props.lineDates, props.lineValues, props.hotData],
  () => {
    initPieChart(props.pieData)
    initBarChart(props.barData)
    initLineChart(props.lineDates, props.lineValues)
    initHotChart(props.hotData)
  },
  { deep: true }
)
</script>

<style scoped>
/* 仅保留与图表区域相关的样式，便于复用 */
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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

.export-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.export-btn:hover {
  color: #1f2937;
  border-color: #d1d5db;
}

@media (max-width: 1200px) {
  .charts-row {
    flex-direction: column;
  }
}
</style>
