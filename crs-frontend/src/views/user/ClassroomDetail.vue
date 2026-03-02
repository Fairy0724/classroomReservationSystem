<template>
  <div class="classroom-detail-page">
    <!-- ============================================================
         顶部导航栏（保持原样式结构，替换为教室系统文案）
         说明：不改样式，改内容，确保整体视觉风格一致
    ============================================================= -->
    <NavBar :keyword="searchQuery" :show-search="true" :show-classroom-link="true"
      @update:keyword="searchQuery = $event" @search="handleSearch" />

    <div class="container">
      <div class="classroom-detail">
        <!-- ============================================================
             教室图片展示区（沿用商品图片布局）
             说明：主图 + 缩略图，便于展示教室多角度照片
        ============================================================= -->
        <div class="classroom-gallery">
          <div class="main-image">
            <img :src="classroom.mainImage" :alt="roomName" />
          </div>
          <div class="thumbnail-list">
            <img v-for="(img, index) in classroom.images" :key="index" :src="img" :alt="roomName"
              @click="changeMainImage(img)" :class="{ active: img === classroom.mainImage }" />
          </div>
        </div>

        <!-- ============================================================
             教室信息区（替换商品信息为教室字段）
             说明：保留原样式模块，字段改为教室信息
        ============================================================= -->
        <div class="classroom-info">
          <h1 class="classroom-name">{{ roomName }}</h1>
          <!-- 教室类型和设备信息和基础信息 -->
          <div class="classroom-meta">
            <div class="type">
              <el-icon>
                <OfficeBuilding />
              </el-icon>
              教室类型：<span>{{ classroom.type }}</span>
            </div>
            <div class="equipment">
              <el-icon>
                <Setting />
              </el-icon>
              教室设备：<span>{{ classroom.equipment || '设备待完善' }}</span>
            </div>
            <div class="status-tag" :class="statusClass">
              <el-icon>
                <Checked />
              </el-icon>
              教室状态：<span>{{ statusText }}</span>
            </div>
            <div class="capacity">
              <el-icon>
                <User />
              </el-icon>
              容纳人数：<span>{{ classroom.capacity }}</span> 人
            </div>
            <div class="location">
              <el-icon>
                <Location />
              </el-icon>
              教室位置：<span>{{ locationText }}</span>
            </div>
            <!-- 所属学院 -->
            <div class="department">
              <el-icon>
                <OfficeBuilding />
              </el-icon>
              所属学院：<span>{{ classroom.deptName }}</span>
            </div>

          </div>

          <!-- 操作按钮（仅展示入口，表单在预约页） -->
          <div class="action-bar">
            <button class="btn-reserve" @click="goToReserve">去预约</button>
          </div>

          <!-- 使用须知（替换服务承诺） -->
          <div class="use-guidelines">
            <div class="guideline-item">
              <i class="icon-genuine"></i>
              <span>提前2小时预约</span>
            </div>
            <div class="guideline-item">
              <i class="icon-shipping"></i>
              <span>准时使用不违约</span>
            </div>
            <div class="guideline-item">
              <i class="icon-return"></i>
              <span>使用后保持整洁</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速查看可预约时段 -->
      <div class="availability-card">
        <div class="availability-header">
          <div class="availability-title">
            <h3>可预约时段</h3>
            <div class="view-toggle">
              <button class="toggle-btn" :class="{ active: viewMode === 'day' }" @click="viewMode = 'day'">
                单日
              </button>
              <button class="toggle-btn" :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">
                每周
              </button>
            </div>
            <p class="hint" v-if="viewMode === 'day'">仅展示当日节次占用情况，提前 2 小时内不可预约。</p>
            <p class="hint" v-else>展示本周周一至周日的占用情况，提前 2 小时内不可预约。</p>
          </div>
          <div class="date-picker">
            <label v-if="viewMode === 'day'">日期</label>
            <label v-else>周次</label>
            <!-- 单日：按天选择；周视图：按周选择（ISO 周） -->
            <input v-if="viewMode === 'day'" type="date" v-model="selectedDate" :min="minDate" :max="maxDate" />
            <input v-else type="week" v-model="selectedWeek" :min="minWeek" :max="maxWeek" />
          </div>
        </div>

        <div class="legend">
          <span class="legend-item available">可预约</span>
          <span class="legend-item occupied">已占用</span>
          <span class="legend-item blocked">不可预约</span>
        </div>

        <!-- 单日视图：展示当天节次卡片 -->
        <div v-if="viewMode === 'day'" class="slot-grid">
          <div v-for="slot in periods" :key="slot.id" class="slot-card" :class="slotState(slot)">
            <div class="slot-title">{{ slot.label }}</div>
            <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>
            <div class="slot-status">{{ slotStatusText(slot) }}</div>
          </div>
          <div v-if="!periods.length" class="empty">暂无节次数据</div>
        </div>

        <!-- 周视图：表头 + 时段矩阵（周一到周日） -->
        <div v-else class="week-grid">
          <div class="week-grid-header">
            <div class="week-grid-cell head">节次</div>
            <div v-for="day in weekDates" :key="day" class="week-grid-cell head">
              {{ formatWeekday(day) }}
              <span class="date">{{ formatDateLabel(day) }}</span>
            </div>
          </div>

          <div v-for="slot in periods" :key="slot.id" class="week-grid-row">
            <div class="week-grid-cell period">
              <div class="slot-title">{{ slot.label }}</div>
              <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>
            </div>
            <div v-for="day in weekDates" :key="day + '-' + slot.id" class="week-grid-cell"
              :class="slotStateForDate(slot, day)">
            </div>
          </div>

          <div v-if="!periods.length" class="empty">暂无节次数据</div>
        </div>
      </div>

      <!-- ============================================================
           教室详情 tabs（保留结构，替换内容）
      ============================================================= -->
      <div class="classroom-tabs">
        <div class="tab-headers">
          <div v-for="tab in tabs" :key="tab.key" :class="['tab-header', { active: currentTab === tab.key }]"
            @click="currentTab = tab.key">
            {{ tab.label }}
          </div>
        </div>

        <div class="tab-content">
          <!-- 教室介绍 -->
          <div v-if="currentTab === 'detail'" class="detail-content">
            <p>所属学院：{{ classroom.deptName }}</p>
            <p>楼号：{{ classroom.building }}</p>
            <p>楼层：{{ classroom.floor }}</p>
            <p>教室编号：{{ classroom.roomNum }}</p>
            <p>教室类型：{{ classroom.type }}</p>
            <p>设备：{{ classroom.equipment || '设备待完善' }}</p>
          </div>
          <!-- 设备参数 -->
          <div v-if="currentTab === 'params'" class="params-content">
            <table>
              <tbody>
                <tr>
                  <td class="param-key">容量</td>
                  <td class="param-value">{{ classroom.capacity }} 人</td>
                </tr>
                <tr>
                  <td class="param-key">状态</td>
                  <td class="param-value">{{ statusText }}</td>
                </tr>
                <tr>
                  <td class="param-key">设备</td>
                  <td class="param-value">{{ classroom.equipment || '设备待完善' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================================
 * 教室详情页逻辑说明（保留原商品详情页结构，替换为教室业务）
 * ============================================================
 * 目标：
 * 1. 保持原页面结构和样式
 * 2. 将“商品”语义替换为“教室预约”语义
 * 3. 添加关键注释，便于理解逻辑
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import { useUserStore } from '../../stores/userStore'
import request from '../../utils/request'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, Setting, Checked, User, Location } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ==================== 基础数据 ====================
const classroom = ref({
  classroomId: null,
  building: '',
  floor: 1,
  roomNum: '',
  deptName: '',
  capacity: 0,
  equipment: '',
  type: '',
  status: '',
  mainImage: '',
  extraImages: [],
  images: []
})

const searchQuery = ref('')
const currentTab = ref('detail')
// 选择的日期：既是“单日”的日期，也是“周视图”的锚点
const selectedDate = ref('')
// 周选择器绑定值：YYYY-Www
const selectedWeek = ref('')
// 视图模式：day = 单日；week = 每周
const viewMode = ref('day')
const periods = ref([])
const occupiedSlotIds = ref([])
// 周视图占用缓存：{ 'YYYY-MM-DD': [periodId, ...] }
const occupiedByDate = ref({})

// Tabs 配置（保留结构，内容改为数据库字段展示）
const tabs = [
  { key: 'detail', label: '教室介绍' },
  { key: 'params', label: '设备参数' }
]


// 教室状态文本
const statusText = computed(() => {
  const map = {
    available: '可预约',
    occupied: '使用中',
    maintenance: '维护中',
    '可用': '可预约',
    '维护中': '维护中'
  }
  return map[classroom.value.status] || classroom.value.status || '可预约'
})

// 新增：匹配CSS样式的英文类名（核心！解决样式不匹配）
const statusClass = computed(() => {
  const map = {
    // 后端可能返回的中文/英文状态 → 统一映射为CSS的英文类名
    '可用': 'available',
    '可预约': 'available',
    'available': 'available',
    '使用中': 'occupied',
    'occupied': 'occupied',
    '维护中': 'maintenance',
    'maintenance': 'maintenance'
  }
  return map[classroom.value.status] || 'available' // 无值默认显示可预约样式
})

// 教室名称：楼号 + 教室编号
const roomName = computed(() => {
  const building = classroom.value.building || ''
  const roomNum = classroom.value.roomNum || ''
  return `${building}${roomNum}` || '教室'
})

// 位置信息
const locationText = computed(() => {
  return `${classroom.value.building}-${classroom.value.floor}层-${classroom.value.roomNum}`
})

// 将 Date 转成本地日期字符串（避免时区偏移导致日期错位）
const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().split('T')[0]
}

const minDate = computed(() => getLocalDateString())
const maxDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return getLocalDateString(d)
})

// week 输入的最小/最大值（与日期范围保持一致）
const minWeek = computed(() => getWeekString(new Date()))
const maxWeek = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return getWeekString(d)
})

// ==================== 页面交互方法 ====================

/** 搜索教室 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/classrooms',
      query: { keyword: searchQuery.value }
    })
  }
}

/** 修改主图 */
const changeMainImage = (img) => {
  if (!img) return
  classroom.value.mainImage = img
}

// ==================== 可预约时段（单日/每周） ====================
// 拉取节次基础信息
const fetchPeriods = async () => {
  try {
    const res = await request.get('/class-periods')
    const list = Array.isArray(res) ? res : []
    periods.value = list.map(item => ({
      id: item.period_id,
      label: item.period_name,
      startTime: item.start_time,
      endTime: item.end_time
    }))
  } catch {
    periods.value = []
  }
}

// 单日占用：只拉取选中日期的占用节次 
const fetchOccupiedPeriods = async () => {
  if (!classroom.value.classroomId || !selectedDate.value) return
  try {
    const res = await request.get('/reservations/occupied', {
      params: {
        classroomId: classroom.value.classroomId,
        date: selectedDate.value
      }
    })
    const list = Array.isArray(res?.data) ? res.data : []
    occupiedSlotIds.value = list.map(id => Number(id)).filter(id => !Number.isNaN(id))
  } catch {
    occupiedSlotIds.value = []
  }
}

// 周视图占用：依次拉取周一到周日的占用节次
const fetchWeekOccupiedPeriods = async () => {
  if (!classroom.value.classroomId || !selectedDate.value) return
  const dates = weekDates.value
  const result = {}
  await Promise.all(
    dates.map(async (dateStr) => {
      try {
        const res = await request.get('/reservations/occupied', {
          params: {
            classroomId: classroom.value.classroomId,
            date: dateStr
          }
        })
        const list = Array.isArray(res?.data) ? res.data : []
        result[dateStr] = list.map(id => Number(id)).filter(id => !Number.isNaN(id))
      } catch {
        result[dateStr] = []
      }
    })
  )
  occupiedByDate.value = result
}

const parseTime = (timeStr) => {
  if (!timeStr) return null
  const [hour, minute] = String(timeStr).split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

// 默认日期规则：
// - 优先兜底返回“当天”
// - 仅在“规则可计算且有效”时，才根据 2 小时限制决定是否切到次日
const getDefaultSelectedDate = () => {
  const todayStr = getLocalDateString()
  if (!todayStr) return getLocalDateString(new Date())
  if (!periods.value.length) return todayStr

  const latest = periods.value
    .map(slot => ({ parsed: parseTime(slot.startTime) }))
    .filter(item => item.parsed)
    .reduce((acc, curr) => {
      if (!acc) return curr
      const a = acc.parsed
      const b = curr.parsed
      if (b.hour > a.hour) return curr
      if (b.hour === a.hour && b.minute > a.minute) return curr
      return acc
    }, null)

  if (!latest) return todayStr

  const latestStart = new Date(
    `${todayStr}T${String(latest.parsed.hour).padStart(2, '0')}:${String(latest.parsed.minute).padStart(2, '0')}:00`
  )
  if (Number.isNaN(latestStart.getTime())) return todayStr

  const now = new Date()
  const limitTime = new Date(latestStart.getTime() - 2 * 60 * 60 * 1000)
  if (Number.isNaN(limitTime.getTime())) return todayStr

  if (now >= limitTime) return todayStr

  const tomorrow = new Date(`${todayStr}T00:00:00`)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateString(tomorrow)
}
// 初始化选中日期（默认当天或第二天）
const initSelectedDate = () => {
  // 单日默认使用“当天”，避免被周逻辑影响
  const dateStr = getLocalDateString()
  selectedDate.value = dateStr
  if (viewMode.value === 'week') {
    selectedWeek.value = getWeekString(new Date(`${dateStr}T00:00:00`))
  }
}

// 计算某个日期的“节次开始时间”（用于 2 小时预约限制）
const getSlotStartTime = (slot, dateStr) => {
  const parsed = parseTime(slot.startTime)
  if (!parsed || !dateStr) return null
  const slotStart = new Date(`${dateStr}T${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:00`)
  return Number.isNaN(slotStart.getTime()) ? null : slotStart
}

// 单日：提前 2 小时限制
const isSlotBlocked = (slot) => {
  const slotStart = getSlotStartTime(slot, selectedDate.value)
  if (!slotStart) return false
  const now = new Date()
  const limitTime = new Date(slotStart.getTime() - 2 * 60 * 60 * 1000)
  return now >= limitTime
}

// 周视图：对指定日期应用“提前 2 小时”限制
const isSlotBlockedForDate = (slot, dateStr) => {
  const slotStart = getSlotStartTime(slot, dateStr)
  if (!slotStart) return false
  const now = new Date()
  const limitTime = new Date(slotStart.getTime() - 2 * 60 * 60 * 1000)
  return now >= limitTime
}

const slotState = (slot) => {
  if (occupiedSlotIds.value.includes(Number(slot.id))) return 'occupied'
  if (isSlotBlocked(slot)) return 'blocked'
  return 'available'
}

const slotStatusText = (slot) => {
  const state = slotState(slot)
  if (state === 'occupied') return '已占用'
  if (state === 'blocked') return '不可预约'
  return '可预约'
}

// 周视图：某天的节次状态
const slotStateForDate = (slot, dateStr) => {
  const list = occupiedByDate.value[dateStr] || []
  if (list.includes(Number(slot.id))) return 'occupied'
  if (isSlotBlockedForDate(slot, dateStr)) return 'blocked'
  return 'available'
}

const slotStatusTextForDate = (slot, dateStr) => {
  const state = slotStateForDate(slot, dateStr)
  if (state === 'occupied') return '已占用'
  if (state === 'blocked') return '不可预约'
  return '可预约'
}

// 计算“本周周一到周日”的日期数组（以 selectedDate 为锚点）
const weekDates = computed(() => {
  if (!selectedDate.value) return []
  const base = new Date(`${selectedDate.value}T00:00:00`)
  if (Number.isNaN(base.getTime())) return []
  const day = base.getDay() // 0=周日，1=周一
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(base)
  monday.setDate(base.getDate() + diffToMonday)
  return Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + index)
    return getLocalDateString(d)
  })
})

// 周选择器：将 Date 转成 ISO 周字符串（YYYY-Www）
const getWeekString = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // ISO 周：周四归属周
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// 周选择器：将 ISO 周字符串（YYYY-Www）转为该周周一日期
const getMondayFromWeek = (weekStr) => {
  if (!weekStr) return null
  const match = /^([0-9]{4})-W([0-9]{2})$/.exec(weekStr)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (!year || !week) return null
  // ISO 周：第 1 周是包含 1 月 4 日的那一周
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayNum = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayNum + 1 + (week - 1) * 7)
  return getLocalDateString(new Date(monday))
}

// 周视图表头显示：周几
const formatWeekday = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`)
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return map[d.getDay()] || ''
}

// 周视图表头显示：日期（月-日）
const formatDateLabel = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
}

// ==================== 预约入口 ====================

/** 跳转到预约页面（预约表单单独页面） */
const goToReserve = () => {
  if (!userStore.token) {
    router.push('/login')
    return
  }
  router.push(`/classroom/${classroom.value.classroomId}/reserve`)
}

// ==================== 获取教室详情 ====================

/**
 * 说明：
 * 1. 请求后端接口
 * 2. 若教室不存在则跳回列表
 */
const fetchClassroom = async () => {
  let res = null
  try {
    res = await request.get('/classrooms', {
      params: { id: route.params.id }
    })
  } catch (error) {
    ElMessage.error('教室信息加载失败')
    router.push('/classrooms')
    return
  }

  if (Array.isArray(res) && res.length > 0) {
    classroom.value = res[0]
  } else {
    throw new Error('教室不存在')
  }

  // 统一图片列表
  classroom.value.images = [
    classroom.value.mainImage,
    ...(Array.isArray(classroom.value.extraImages) ? classroom.value.extraImages : [])
  ].filter(Boolean)
}

// 初始化
onMounted(async () => {
  fetchClassroom()
  await fetchPeriods()
  initSelectedDate()
})

// 统一刷新：根据当前视图拉取占用数据
const refreshAvailability = () => {
  if (viewMode.value === 'week') {
    fetchWeekOccupiedPeriods()
  } else {
    fetchOccupiedPeriods()
  }
}

watch([() => classroom.value.classroomId, selectedDate, viewMode], () => {
  refreshAvailability()
})

// 周选择变化：同步更新 selectedDate（周一作为锚点）
watch(selectedWeek, (val) => {
  if (viewMode.value !== 'week') return
  if (!val) return
  const monday = getMondayFromWeek(val)
  if (monday) selectedDate.value = monday
})

// 切换到周视图时，自动把周选择器对齐到当前 selectedDate 所在周
watch(viewMode, (mode) => {
  if (mode === 'week') {
    const date = selectedDate.value ? new Date(`${selectedDate.value}T00:00:00`) : new Date()
    selectedWeek.value = getWeekString(date)
  }
})
</script>

<style scoped>
.classroom-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.classroom-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.classroom-gallery {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-image {
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
  overflow: hidden;
  border-radius: 8px;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-list {
  display: flex;
  gap: 10px;
}

.thumbnail-list img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
}

.thumbnail-list img.active {
  border-color: #2ecc71;
}

/* 教室详细信息 */
.classroom-info {
  background: #fff;
  /* 内边距 */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.classroom-name {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 12px;
}

.classroom-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 30px;
  color: #666;
}

/* .capacity {
  font-size: 28px;
  color: #2ecc71;
  font-weight: bold;
} */

.location {
  color: #666;
}

/* 教室状态标签 */
.status-tag span {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}

/* .status-tag.available span {
  background: #e6ffed;
  color: #2ecc71;
} */
/* 教室状态标签颜色 */
.status-tag.available span {
  background: #e6ffed;
  color: #2ecc71;
}

.status-tag.occupied span {
  background: #fff4e5;
  color: #f39c12;
}

.status-tag.maintenance span {
  background: #fee2e2;
  color: #dc2626;
}

.action-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.btn-reserve {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-reserve {
  background: #2ecc71;
  color: #fff;
  flex: 2;
}


.use-guidelines {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid #eee;
}

.guideline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.classroom-tabs {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 40px;
}

.tab-headers {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab-header {
  padding: 20px 40px;
  cursor: pointer;
  color: #666;
}

.tab-header.active {
  color: #2ecc71;
  border-bottom: 2px solid #2ecc71;
}

.tab-content {
  padding: 40px;
}

.params-content table {
  width: 100%;
  border-collapse: collapse;
}

.params-content td {
  padding: 12px;
  border: 1px solid #eee;
}

.param-key {
  background: #f8f9fa;
  width: 200px;
}

/* ==================== 教室详情新增样式 ==================== */
.availability-card {
  margin-top: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.availability-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.availability-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.view-toggle {
  display: inline-flex;
  gap: 6px;
  margin-top: 4px;
}

.toggle-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn.active {
  border-color: #2ecc71;
  color: #2ecc71;
  background: #e6ffed;
}

.availability-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.availability-header .hint {
  margin: 4px 0 0;
  color: #888;
  font-size: 12px;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-picker label {
  color: #666;
  font-size: 12px;
}

.date-picker input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  outline: none;
}

.legend {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.legend-item {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.legend-item.available {
  background: #c8f0d8;
  color: #0b5d2a;
}

.legend-item.occupied {
  background: #ffd4cf;
  color: #8e1b12;
}

.legend-item.blocked {
  background: #d9dee7;
  color: #344054;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.slot-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  background: #fff;
}

.slot-card.available {
  border-color: #7fd1a7;
  background: #c8f0d8;
}

.slot-card.occupied {
  border-color: #ff8a80;
  background: #ffd4cf;
}

.slot-card.blocked {
  border-color: #98a2b3;
  background: #d9dee7;
}

.slot-title {
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.slot-time {
  font-size: 12px;
  color: #6b7280;
}

.slot-status {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 500;
}

.slot-card.available .slot-status {
  color: #0b5d2a;
}

.slot-card.occupied .slot-status {
  color: #8e1b12;
}

.slot-card.blocked .slot-status {
  color: #344054;
}

.slot-grid .empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #98a2b3;
  padding: 20px 0;
}

/* 周视图矩阵（表头 + 行列） */
.week-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.week-grid-header,
.week-grid-row {
  display: grid;
  /* 表头 */
  grid-template-columns: 140px repeat(7, minmax(90px, 1fr));
  gap: 1px;
}

/* 周视图矩阵单元格 */
.week-grid-cell {
  padding: 10px 8px;
  border-radius: 2px;
  border: 1px solid #eef0f4;
  background: #fff;
  text-align: center;
  font-size: 12px;
}

/* 周视图矩阵表头单元格 */
.week-grid-cell.head {
  background: #fff;
  color: #475467;
  font-weight: 600;
}

.week-grid-cell.head .date {
  display: block;
  margin-top: 2px;
  font-weight: 400;
  color: #98a2b3;
}

.week-grid-cell.period {
  text-align: left;
}

.week-grid-cell.available {
  border-color: #7fd1a7;
  background: #c8f0d8;
  color: #0b5d2a;
}

.week-grid-cell.occupied {
  border-color: #ff8a80;
  background: #ffd4cf;
  color: #8e1b12;
}

.week-grid-cell.blocked {
  border-color: #98a2b3;
  background: #d9dee7;
  color: #344054;
}

.week-grid .status-text {
  font-weight: 600;
}

.date-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}
</style>