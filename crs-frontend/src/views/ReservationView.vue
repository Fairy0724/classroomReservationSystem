<script setup>
/**
 * 预约页面（独立于详情页）
 * 依据用例：提交预约申请
 * - 参与者：学生/教师
 * - 目标：填写活动信息并提交申请
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import request from '../utils/request'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ==================== 教室信息（展示用） ====================
const classroom = ref({
  id: null,
  name: '',
  location: '',
  capacity: 0,
  status: 'available'
})

// ==================== 预约表单 ====================
const form = ref({
  date: new Date().toISOString().split('T')[0],
  timeSlots: [],
  activityName: '',
  attendeeCount: 1,
  purpose: '',
  purposeType: 'nonTeaching' // teaching | nonTeaching
})

// 可选时段（示例数据，后续可由后端返回）
const timeSlots = ref([
  { id: 1, label: '第1-2节 08:00-10:00' },
  { id: 2, label: '第3-4节 10:00-12:00' },
  { id: 3, label: '第5-6节 14:00-16:00' },
  { id: 4, label: '第7-8节 16:00-18:00' },
  { id: 5, label: '第9-10节 19:00-21:00' }
])

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
  if (!form.value.purpose.trim()) {
    ElMessage.warning('请填写活动用途说明')
    return
  }

  // 6. 提交预约
  try {
    const payload = {
      classroomId: classroom.value.id,
      userId: userStore.userInfo?.id,
      role: userStore.userInfo?.role,
      date: form.value.date,
      timeSlots: form.value.timeSlots.map(id => timeSlots.value.find(t => t.id === id)?.label),
      attendeeCount: form.value.attendeeCount,
      activityName: form.value.activityName,
      purpose: form.value.purpose,
      purposeType: form.value.purposeType
    }

    await request.post('/reservations', payload)
    ElMessage.success('预约申请已提交')
    router.push('/my-reservations')
  } catch (error) {
    // 后端返回的错误信息会被拦截器处理
  }
}

onMounted(() => {
  fetchClassroom()
})
</script>

<template>
  <div class="reserve-page">
    <div class="header">
      <h1>提交预约申请</h1>
      <p>请填写活动信息，系统将进行合规性与冲突检测。</p>
    </div>

    <!-- 教室基本信息展示（确保用户知道当前选择的教室） -->
    <div class="classroom-info">
      <h2>{{ classroom.name }}</h2>
      <div class="meta">
        <span>位置：{{ classroom.location }}</span>
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
          <label v-for="slot in timeSlots" :key="slot.id" class="slot">
            <input type="checkbox" :value="slot.id" v-model="form.timeSlots" />
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
        <label>参与人数</label>
        <input type="number" v-model="form.attendeeCount" min="1" :max="classroom.capacity" />
        <small class="tip">不得超过教室容量</small>
      </div>

      <div class="form-item">
        <label>活动用途说明</label>
        <textarea v-model="form.purpose" rows="3" placeholder="例如：课程教学 / 社团活动 / 考试等"></textarea>
      </div>

      <div class="form-item">
        <label>申请性质</label>
        <div class="radio-group">
          <label>
            <input type="radio" value="teaching" v-model="form.purposeType" /> 教学相关
          </label>
          <label>
            <input type="radio" value="nonTeaching" v-model="form.purposeType" /> 非教学相关
          </label>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" @click="submitReservation">提交预约</button>
        <button class="btn-secondary" @click="router.back()">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reserve-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px 40px;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px;
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
  color: #999;
  font-size: 12px;
}
</style>
