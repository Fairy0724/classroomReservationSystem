<template>
  <div class="reserve-page">
    <!-- 导航栏 -->
    <NavBar :show-search="true" />
    <!-- 内容 -->
    <div class="container">
      <div class="header">
        <h1>提交预约申请</h1>
      </div>
      <!-- 教室基本信息展示（确保用户知道当前选择的教室） -->
      <div class="classroom-info">
        <h2>{{ classroom.building }}{{ classroom.roomNum }}</h2>
        <div class="meta">
          <span>位置：{{ classroom.building }}-{{ classroom.floor }}层</span>
          <span>容量：{{ classroom.capacity }} 人</span>
        </div>
      </div>

      <!-- 预约表单 -->
      <div class="form">
        <div class="form-item">
          <label>预约日期</label>
          <input type="date" v-model="form.date" />
          <small v-if="!isDateValid" class="error">请选择未来一月的有效日期</small>
        </div>

        <div class="form-item">
          <label>预约时段（支持连续节次）</label>
          <div class="slot-list">
            <label v-for="slot in timeSlots" :key="slot.id" class="slot" :class="{ disabled: isSlotDisabled(slot) }">
              <input type="checkbox" :value="slot.id" v-model="form.timeSlots" :disabled="isSlotDisabled(slot)" />
              {{ slot.label }}
            </label>
          </div>
          <small v-if="form.timeSlots.length && !isTimeSlotContinuous" class="error">预约时段需连续节次</small>
        </div>

        <div class="form-item">
          <label>活动名称</label>
          <input type="text" v-model="form.activityName" placeholder="例如：高数补课/社团活动" />
        </div>

        <div class="form-item">
          <label>活动类型</label>
          <select v-model="form.activityType">
            <option value="教学">教学</option>
            <option value="社团">社团</option>
            <option value="自习">自习</option>
            <option value="会议">会议</option>
            <option value="考试">考试</option>
            <!-- 其他：选择后在下方补充具体类型 -->
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-item">
          <!-- HTML 标准不允许在 <option> 内放输入框，因此用独立输入框承载“其他”类型 -->
          <input v-if="form.activityType === '其他'" type="text" v-model="form.otherActivityType"
            placeholder="请输入其他活动类型" />
        </div>

        <div class="form-item">
          <label>参与人数</label>
          <input type="number" v-model="form.attendeeCount" min="1" :max="classroom.capacity" />
          <!-- 超过教室容量的时候再提示 -->
          <small v-if="form.attendeeCount > classroom.capacity" class="tip">不得超过教室容量</small>
        </div>

        <div class="form-item">
          <label>活动用途说明</label>
          <textarea v-model="form.purpose" rows="3" placeholder="例如：课程教学 / 社团活动 / 考试等"></textarea>
        </div>

        <div class="actions">
          <button class="btn-primary" @click="submitReservation">提交预约</button>
          <button class="btn-secondary" @click="router.back()">返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 预约页面（独立于详情页）
 * 依据用例：提交预约申请
 * - 参与者：学生/教师
 * - 目标：填写活动信息并提交申请
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import request from '../../utils/request'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ==================== 教室信息（展示用） ====================
const classroom = ref({
  classroomId: null,
  building: '',
  floor: 1,
  roomNum: '',
  capacity: 0,
  status: ''
})

// ==================== 预约表单 ====================
const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().split('T')[0]
}

const form = ref({
  date: getLocalDateString(),
  timeSlots: [],
  activityName: '',
  attendeeCount: 1,
  activityType: '教学',
  otherActivityType: '',
  purpose: ''
})

// 可选时段（来自后端 class_period 表）
const timeSlots = ref([])
// 已占用节次（来自预约记录）
const occupiedSlotIds = ref([])

// ==================== 计算与校验 ====================

// 日期校验：未来30天内
const isDateValid = computed(() => {
  const selected = new Date(form.value.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 30)
  return selected >= today && selected <= maxDate
})

// 连续时段校验（要求选择的时段为连续节次）
const isTimeSlotContinuous = computed(() => {
  if (form.value.timeSlots.length <= 1) return true
  const sorted = [...form.value.timeSlots].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
})

// ==================== 数据获取 ====================

const fetchClassroom = async () => {
  try {
    const res = await request.get('/classrooms', {
      params: { id: route.params.id }
    })
    if (Array.isArray(res) && res.length > 0) {
      classroom.value = res[0]
    } else if (res && res.id) {
      classroom.value = res
    } else {
      throw new Error('教室不存在')
    }
  } catch (error) {
    ElMessage.error('教室信息加载失败')
    router.push('/classrooms')
  }
}

// 获取节次列表（默认开放第1节-第10节）
const fetchPeriods = async () => {
  try {
    const res = await request.get('/class-periods')
    const list = Array.isArray(res) ? res : []
    timeSlots.value = list.map(item => ({
      id: item.period_id,
      label: `${item.period_name} ${item.start_time}-${item.end_time}`,
      startTime: item.start_time,
      endTime: item.end_time
    }))

    initDateIfNeeded()
  } catch (error) {
    ElMessage.error('获取节次列表失败')
  }
}

// 获取已占用节次
const fetchOccupiedPeriods = async () => {
  if (!classroom.value.classroomId || !form.value.date) return
  try {
    const res = await request.get('/reservations/occupied', {
      params: {
        classroomId: classroom.value.classroomId,
        date: form.value.date
      }
    })
    const list = Array.isArray(res?.data) ? res.data : []
    occupiedSlotIds.value = list.map(id => Number(id)).filter(id => !Number.isNaN(id))
  } catch (error) {
    occupiedSlotIds.value = []
  }
}

// ==================== 时段可用性（开始前 2 小时内不可预约） ====================
const getSlotById = (id) => timeSlots.value.find(slot => slot.id === id)

const parseTime = (timeStr) => {
  if (!timeStr) return null
  const [hour, minute] = String(timeStr).split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

const getSlotStartTime = (slot, dateStr) => {
  if (!slot || !dateStr) return null
  const parsed = parseTime(slot.startTime) || (() => {
    const match = String(slot.label).match(/(\d{2}:\d{2})-(\d{2}:\d{2})/)
    return match ? parseTime(match[1]) : null
  })()

  if (!parsed) return null

  const slotStart = new Date(`${dateStr}T${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:00`)
  return Number.isNaN(slotStart.getTime()) ? null : slotStart
}
// 校验单个时段是否已禁用
const isSlotDisabled = (slot, dateStr = form.value.date) => {
  if (!slot || !dateStr) return false
  if (occupiedSlotIds.value.includes(Number(slot.id))) return true
  const slotStart = getSlotStartTime(slot, dateStr)
  if (!slotStart) return false

  const now = new Date()
  const limitTime = new Date(slotStart.getTime() - 2 * 60 * 60 * 1000)
  return now >= limitTime
}
// 校验所有时段是否已禁用
const isAllSlotsDisabledForDate = (dateStr) => {
  if (!dateStr || !timeSlots.value.length) return false
  return timeSlots.value.every(slot => isSlotDisabled(slot, dateStr))
}
// 初始化日期（如果所选日期所有时段均不可用，则自动跳到下一天）
const initDateIfNeeded = () => {
  if (!form.value.date || !timeSlots.value.length) return
  if (isAllSlotsDisabledForDate(form.value.date)) {
    const selected = new Date(form.value.date)
    selected.setHours(0, 0, 0, 0)
    const nextDay = new Date(selected)
    nextDay.setDate(nextDay.getDate() + 1)
    form.value.date = getLocalDateString(nextDay)
  }
}

// ==================== 表单提交 ====================

const submitReservation = async () => {
  // 1. 登录校验
  if (!userStore.token) {
    router.push('/login')
    return
  }

  // 2. 日期校验
  if (!isDateValid.value) {
    ElMessage.warning('请选择未来一月的有效日期')
    return
  }

  // 3. 时段校验
  if (form.value.timeSlots.length === 0) {
    ElMessage.warning('请选择预约时段')
    return
  }
  if (!isTimeSlotContinuous.value) {
    ElMessage.warning('预约时段需连续节次')
    return
  }

  // 4. 人数校验
  if (form.value.attendeeCount <= 0) {
    ElMessage.warning('参与人数请输入正整数')
    return
  }
  if (form.value.attendeeCount > classroom.value.capacity) {
    ElMessage.warning('参与人数不得超过教室最大容量人数')
    return
  }

  // 5. 关键信息校验
  if (!form.value.activityName.trim()) {
    ElMessage.warning('请填写活动名称')
    return
  }
  if (!form.value.activityType) {
    ElMessage.warning('请选择活动类型')
    return
  }
  // 如果选择“其他”，必须填写具体类型
  if (form.value.activityType === '其他' && !form.value.otherActivityType.trim()) {
    ElMessage.warning('请填写其他活动类型')
    return
  }
  if (!form.value.purpose.trim()) {
    ElMessage.warning('请填写活动用途说明')
    return
  }

  // 6. 计算开始/结束时间（用于数据库 start_time/end_time）
  const { startTime, endTime } = getTimeRange()
  if (!startTime || !endTime) {
    ElMessage.warning('时段时间解析失败，请重新选择')
    return
  }

  // 6. 提交预约
  try {
    // 活动类型：如果选择“其他”，使用用户输入的具体类型
    const resolvedActivityType =
      form.value.activityType === '其他'
        ? form.value.otherActivityType.trim()
        : form.value.activityType

    const payload = {
      classroomId: classroom.value.classroomId,
      userId: userStore.userInfo?.id,
      role: userStore.userInfo?.role,
      date: form.value.date,
      startTime,
      endTime,
      periodIds: form.value.timeSlots,
      timeSlots: form.value.timeSlots.map(id => timeSlots.value.find(t => t.id === id)?.label),
      attendeeCount: form.value.attendeeCount,
      activityName: form.value.activityName,
      activityType: resolvedActivityType,
      purpose: form.value.purpose
    }
    // 向后端提交预约请求
    await request.post('/reservations', payload)
    // 成功反馈与跳转
    // 如果是老师的教学预约，直接显示预约成功信息
    if (userStore.userInfo?.role === '教师' && form.value.activityType === '教学') {
      ElMessage.success('预约成功，教室已预留给您进行教学使用')
    }
    else {
      ElMessage.success('预约申请已提交')
    }
    router.push('/my-reservations')
  } catch (error) {
    // 后端返回的错误信息会被拦截器处理
  }
}

onMounted(() => {
  fetchClassroom()
  fetchPeriods()
})

watch([() => form.value.date, timeSlots], () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selected = new Date(form.value.date)
  selected.setHours(0, 0, 0, 0)

  if (form.value.date && selected < today) {
    ElMessage.warning('请预约后面的日期')
  }

  if (form.value.date && isAllSlotsDisabledForDate(form.value.date)) {
    const nextDay = new Date(selected)
    nextDay.setDate(nextDay.getDate() + 1)
    form.value.date = getLocalDateString(nextDay)
    ElMessage.warning('当天时段已过，请预约后面的日期')
    return
  }

  fetchOccupiedPeriods()

  if (!form.value.timeSlots.length) return
  form.value.timeSlots = form.value.timeSlots.filter(id => {
    const slot = getSlotById(id)
    return slot && !isSlotDisabled(slot)
  })
})

watch([() => classroom.value.classroomId, () => form.value.date], () => {
  fetchOccupiedPeriods()
})

// ==================== 工具方法 ====================
/**
 * 从已选节次中提取开始/结束时间
 * 例如："第1节 08:00-10:00" -> startTime=08:00, endTime=10:00
 */
// 获取已选时段的时间范围
const getTimeRange = () => {
  const selectedSlots = form.value.timeSlots
    .map(id => timeSlots.value.find(t => String(t.id) === String(id)))
    .filter(Boolean)

  if (!selectedSlots.length) return { startTime: '', endTime: '' }

  // 按节次ID排序，取最早开始与最晚结束
  const sorted = [...selectedSlots].sort((a, b) => Number(a.id) - Number(b.id))
  const startTime = sorted[0].startTime
  const endTime = sorted[sorted.length - 1].endTime
  return { startTime, endTime }
}
</script>


<style scoped>
.reserve-page {
  min-height: 100vh;
  background: #f0f4f8;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px;
  /* 加粗 */
  font-weight: bold;
}

.classroom-info {
  background: #fff;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.meta {
  display: flex;
  gap: 20px;
  color: #666;
  font-size: 14px;
}

.form {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-item input,
.form-item textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.form-item select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
}

.slot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.slot {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 6px 10px;
}

.slot.disabled {
  background: #f0f0f0;
  color: #aaa;
  cursor: not-allowed;
}

.slot input:disabled {
  cursor: not-allowed;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  background: #409eff;
  border: none;
  color: #fff;
  padding: 10px 18px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-secondary {
  background: #f5f5f5;
  border: none;
  color: #333;
  padding: 10px 18px;
  border-radius: 6px;
  cursor: pointer;
}

.error {
  color: #f56c6c;
  font-size: 12px;
}

.tip {
  color: #f56c6c;
  font-size: 12px;
}
</style>
