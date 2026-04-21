<template>
  <div class="history-dashboard">
    <!-- 1) 横向柱状图：教室预约量排行（本月/选择月份/半年 + 预约次数/时长） -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>教室预约量排行</h3>
        </div>
        <div class="panel-controls">
          <label>周期</label>
          <select v-model="rankRange">
            <option value="month">本月</option>
            <option value="customMonth">选择月份</option>
            <option value="halfYear">半年</option>
          </select>
          <label v-if="rankRange === 'customMonth'">月份</label>
          <input v-if="rankRange === 'customMonth'" type="month" v-model="rankMonth" />
          <label>指标</label>
          <select v-model="rankMetric">
            <option value="count">预约次数</option>
            <option value="duration">预约时长</option>
          </select>
        </div>
      </div>
      <VChart class="chart" :option="rankOption" autoresize />
    </section>

    <!-- 2) 环形图：预约状态占比（全部/单教室） -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>预约状态占比</h3>
        </div>
        <div class="panel-controls">
          <label>范围</label>
          <select v-model="statusRoom">
            <option value="all">全部教室</option>
            <option v-for="room in roomOptions" :key="room" :value="room">{{ room }}</option>
          </select>
        </div>
      </div>
      <VChart class="chart" :option="statusOption" autoresize />
    </section>

    <!-- 3) 折线图：预约趋势（本月/选择月份/半年） -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>预约趋势</h3>
        </div>
        <div class="panel-controls">
          <label>周期</label>
          <select v-model="trendRange">
            <option value="month">本月</option>
            <option value="customMonth">选择月份</option>
            <option value="halfYear">半年</option>
          </select>
          <label v-if="trendRange === 'customMonth'">月份</label>
          <input v-if="trendRange === 'customMonth'" type="month" v-model="trendMonth" />
          <label>范围</label>
          <select v-model="trendRoom">
            <option value="all">全部教室</option>
            <option v-for="room in roomOptions" :key="room" :value="room">{{ room }}</option>
          </select>
        </div>
      </div>
      <VChart class="chart" :option="trendOption" autoresize />
    </section>

    <!-- 4) 竖向柱状图：时段分布（本月平均/半年平均） -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>教室日时段预约分布</h3>
        </div>
        <div class="panel-controls">
          <label>模式</label>
          <select v-model="slotMode">
            <option value="monthAvg">本月平均</option>
            <option value="halfYearAvg">半年平均</option>
          </select>
          <label>指标</label>
          <select v-model="slotMetric">
            <option value="count">预约次数</option>
            <option value="duration">预约时长</option>
          </select>
        </div>
      </div>
      <VChart class="chart" :option="slotOption" autoresize />
    </section>
  </div>
</template>

<script setup>
/**
 * 审批历史图表组件
 * 目的：将 ECharts 相关逻辑从页面中拆分，便于维护与复用
 * 输入：records（审批记录列表），roomFormatter（教室名称格式化函数）
 */
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

// ECharts 按需引入（必须注册渲染器，否则会报 Renderer undefined）
import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { graphic } from 'echarts/core'

// 注册 ECharts 必需模块：渲染器 + 图表 + 组件
use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const props = defineProps({
  // 审批记录列表（待审批/已通过/已驳回）
  records: {
    type: Array,
    default: () => []
  },
  // 教室名称格式化函数（由父组件提供）
  roomFormatter: {
    type: Function,
    default: (item) => item?.room_name || ''
  }
})

// ==================== 控件状态 ====================
// 排行图周期：month / customMonth / halfYear
const rankRange = ref('month')
// 排行图指标：count / duration
const rankMetric = ref('count')
// 排行图选择月份（YYYY-MM）
const rankMonth = ref(dayjs().format('YYYY-MM'))
// 状态占比：all 或单教室
const statusRoom = ref('all')
// 趋势：month / customMonth / halfYear
const trendRange = ref('month')
const trendRoom = ref('all')
// 趋势选择月份（YYYY-MM）
const trendMonth = ref(dayjs().format('YYYY-MM'))
// 时段分布：本月平均 or 半年平均
const slotMode = ref('monthAvg')
const slotMetric = ref('count')

// ==================== 数据预处理 ====================
// 统一映射记录结构，避免字段缺失导致报错
const normalizedRecords = computed(() => {
  return props.records.map(item => ({
    raw: item,
    room: props.roomFormatter(item),
    status: item.status || '',
    date: item.date ? dayjs(item.date).format('YYYY-MM-DD') : '',
    startTime: item.start_time || '',
    endTime: item.end_time || ''
  }))
})

// 教室选项列表
const roomOptions = computed(() => {
  const set = new Set()
  normalizedRecords.value.forEach(item => {
    if (item.room) set.add(item.room)
  })
  return Array.from(set)
})


// 获取某条记录的时长（分钟）
const getDurationMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}

// 本周（周一到周日）起止日期
const getWeekRange = () => {
  const today = dayjs()
  const day = today.day() // 0=周日
  const monday = day === 0 ? today.subtract(6, 'day') : today.subtract(day - 1, 'day')
  const sunday = monday.add(6, 'day')
  return { start: monday.startOf('day'), end: sunday.endOf('day') }
}

// 本月起止日期
const getCurrentMonthRange = () => {
  const start = dayjs().startOf('month')
  const end = dayjs().endOf('month')
  return { start, end }
}

// 指定月份起止日期（YYYY-MM）
const getPickedMonthRange = (monthStr) => {
  const base = dayjs(monthStr + '-01')
  const start = base.startOf('month')
  const end = base.endOf('month')
  return { start, end }
}

// 生成月份序列（YYYY-MM）
const getMonthSeries = (range) => {
  const months = []
  let cursor = range.start.startOf('month')
  const end = range.end.startOf('month')
  while (cursor.isBefore(end) || cursor.isSame(end, 'month')) {
    months.push(cursor.format('YYYY-MM'))
    cursor = cursor.add(1, 'month')
  }
  return months
}

// 半年起止日期（向前 6 个月，含今天）
const getHalfYearRange = () => {
  const end = dayjs().endOf('day')
  const start = dayjs().subtract(6, 'month').startOf('day')
  return { start, end }
}

// 根据周期获取起止时间
const resolveRange = (mode, monthStr) => {
  if (mode === 'month') return getCurrentMonthRange()
  if (mode === 'customMonth') return getPickedMonthRange(monthStr || dayjs().format('YYYY-MM'))
  if (mode === 'halfYear') return getHalfYearRange()
  return getWeekRange()
}

// 过滤：按日期范围筛选记录
const filterByRange = (records, range) => {
  return records.filter(item => {
    if (!item.date) return false
    const d = dayjs(item.date)
    return d.isAfter(range.start) || d.isSame(range.start, 'day')
      ? (d.isBefore(range.end) || d.isSame(range.end, 'day'))
      : false
  })
}

// ==================== 1) 横向柱状图：教室排行 ====================
const rankOption = computed(() => {
  const range = resolveRange(rankRange.value, rankMonth.value)
  const filtered = filterByRange(normalizedRecords.value, range)

  // 按教室聚合
  const map = {}
  filtered.forEach(item => {
    if (!map[item.room]) map[item.room] = { room: item.room, count: 0, duration: 0 }
    map[item.room].count += 1
    map[item.room].duration += getDurationMinutes(item.startTime, item.endTime)
  })

  // 排序取前 10
  const list = Object.values(map).sort((a, b) => (rankMetric.value === 'count' ? b.count - a.count : b.duration - a.duration)).slice(0, 10)
  const rooms = list.map(i => i.room)
  const values = list.map(i => (rankMetric.value === 'count' ? i.count : Number((i.duration / 60).toFixed(1))))

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 10, right: 40, top: 20, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      name: rankMetric.value === 'count' ? '次数' : '小时'
    },
    yAxis: {
      type: 'category',
      data: rooms,
      axisLabel: { width: 100, overflow: 'truncate' }
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: 14,
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#e8f7ee' },
            { offset: 1, color: '#2ecc71' },
          ])
        }
      }
    ]
  }
})

// ==================== 2) 环形图：状态占比 ====================
const statusOption = computed(() => {
  const target = statusRoom.value === 'all'
    ? normalizedRecords.value
    : normalizedRecords.value.filter(item => item.room === statusRoom.value)

  // 统计状态（若不存在则为 0）
  const counts = {
    '待审批': 0,
    '已通过': 0,
    '已取消': 0,
    '已驳回': 0
  }
  target.forEach(item => {
    if (counts[item.status] !== undefined) counts[item.status] += 1
  })

  const total = Object.values(counts).reduce((sum, v) => sum + v, 0)

  return {
    title: {
      text: total ? `${total}` : '0',
      subtext: '总预约',
      left: 'center',
      top: 'center',
      textStyle: { fontSize: 18, fontWeight: 700 },
      subtextStyle: { fontSize: 12, color: '#8a94a6' }
    },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    color: ['#e0f2fe', '#e8f7ee', '#fee2e2', '#fef3c7'],
    series: [
      {
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}: {d}%' },
        data: [
          { value: counts['待审批'], name: '待审批' },
          { value: counts['已通过'], name: '已通过' },
          { value: counts['已取消'], name: '已取消' },
          { value: counts['已驳回'], name: '已驳回' }
        ]
      }
    ]
  }
})

// ==================== 3) 折线图：预约趋势 ====================
const trendOption = computed(() => {
  const range = resolveRange(trendRange.value, trendMonth.value)
  const filtered = filterByRange(normalizedRecords.value, range)
  const target = trendRoom.value === 'all'
    ? filtered
    : filtered.filter(item => item.room === trendRoom.value)

  // 半年：按月聚合；本月/选月：按天聚合
  const isMonthlySeries = trendRange.value === 'halfYear'
  const xSeries = isMonthlySeries ? getMonthSeries(range) : (() => {
    const days = []
    let cursor = range.start.startOf('day')
    while (cursor.isBefore(range.end) || cursor.isSame(range.end, 'day')) {
      days.push(cursor.format('YYYY-MM-DD'))
      cursor = cursor.add(1, 'day')
    }
    return days
  })()

  const counts = xSeries.reduce((acc, key) => {
    acc[key] = 0
    return acc
  }, {})

  // 单教室模式：保持原有逻辑
  target.forEach(item => {
    const key = isMonthlySeries ? dayjs(item.date).format('YYYY-MM') : item.date
    if (counts[key] !== undefined) counts[key] += 1
  })

  const trendValues = xSeries.map(key => counts[key])
  const trendMax = Math.max(0, ...trendValues)

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 20, top: 20, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: xSeries.map(key => (isMonthlySeries ? key : dayjs(key).format('MM-DD')))
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      max: trendMax === 0 ? 1 : Math.ceil(trendMax * 1.2),
      axisLabel: { formatter: '{value}' }
    },
    series: [
      {
        type: 'line',
        data: trendValues,
        smooth: true,
        areaStyle: { color: 'rgba(46, 204, 113, 0.2)' },
        lineStyle: { color: '#2ecc71' }
      }
    ]
  }
})

// ==================== 4) 竖向柱状图：时段分布 ====================
const slotOption = computed(() => {
  const range = slotMode.value === 'halfYearAvg'
    ? resolveRange('halfYear')
    : resolveRange('month')
  const base = filterByRange(normalizedRecords.value, range)

  // 按“开始-结束”作为时段键
  const map = {}
  base.forEach(item => {
    if (!item.startTime || !item.endTime) return
    const key = `${item.startTime}-${item.endTime}`
    if (!map[key]) map[key] = { key, count: 0, duration: 0 }
    map[key].count += 1
    map[key].duration += getDurationMinutes(item.startTime, item.endTime)
  })

  // 以时间排序时段
  const list = Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
  const labels = list.map(i => i.key)
  const values = list.map(i => (slotMetric.value === 'count' ? i.count : Number((i.duration / 60).toFixed(1))))

  // 预约次数使用总量（整数）；预约时长使用区间平均（小时）
  const daysInRange = Math.max(1, range.end.diff(range.start, 'day') + 1)
  const normalizedValues = slotMetric.value === 'count'
    ? values.map(v => Math.round(v))
    : values.map(v => Number((v / daysInRange).toFixed(1)))
  const slotMax = Math.max(0, ...normalizedValues)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 30, right: 20, top: 30, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels
    },
    yAxis: {
      type: 'value',
      name: slotMetric.value === 'count' ? '次数' : '小时',
      min: 0,
      minInterval: slotMetric.value === 'count' ? 1 : 0,
      max: slotMetric.value === 'count'
        ? (slotMax === 0 ? 1 : Math.ceil(slotMax * 1.2))
        : (slotMax === 0 ? 1 : Number((slotMax * 1.2).toFixed(2))),
      axisLabel: {
        formatter: (value) => {
          if (value === 0) return '0'
          if (slotMetric.value === 'count') return `${Math.round(value)}`
          return Number.isInteger(value) ? `${value}` : Number(value).toFixed(2)
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: normalizedValues,
        itemStyle: { color: '#2ecc71' }
      }
    ]
  }
})
</script>

<style scoped>
.history-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  min-height: 320px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-header h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.panel-header p {
  margin: 0;
  color: #8a94a6;
  font-size: 12px;
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #667085;
  flex-wrap: wrap;
}

.panel-controls select {
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0 8px;
  background: #f8fafc;
}

.panel-controls input[type="date"],
.panel-controls input[type="month"] {
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0 8px;
  background: #f8fafc;
}


/* 让图表填满父容器高度 */
.chart {
  width: 100%;
  height: 300px;
}

@media (max-width: 900px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
