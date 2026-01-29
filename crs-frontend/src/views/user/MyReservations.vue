<template>
  <div class="my-reservations">
    <!-- 顶部导航 -->
    <NavBar :show-search="false" />

    <!-- 内容区域 -->
    <div class="content">
      <div class="header">
        <h1>我的预约</h1>
        <p>查看自己提交的预约申请与处理状态。</p>
      </div>

      <!-- 筛选区：活动名称/教室/状态/日期区间 -->
      <div class="filter-panel">
        <div class="filter-item">
          <label>关键字</label>
          <input v-model="filters.keyword" type="text" placeholder="活动名称/教室" />
        </div>

        <div class="filter-item">
          <label>状态</label>
          <select v-model="filters.status">
            <option value="">全部</option>
            <option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <div class="filter-item">
          <label>开始日期</label>
          <input v-model="filters.startDate" type="date" />
        </div>

        <div class="filter-item">
          <label>结束日期</label>
          <input v-model="filters.endDate" type="date" />
        </div>

        <button class="reset-btn" @click="resetFilters">清空筛选</button>
        <button class="btn" @click="fetchData">刷新</button>
      </div>

      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="!filteredReservations.length" class="state">暂无预约记录</div>

      <div v-else class="list">
        <div v-for="item in paginatedReservations" :key="item.reservation_id" class="card">
          <div class="card-header">
            <div class="title">
              <span class="room">{{ getClassroomName(item.classroom_id) }}</span>
              <span class="status" :class="getStatusClass(item.status)">{{ item.status }}</span>
            </div>
            <div class="meta">预约日期：{{ formatDate(item.date) }}</div>
          </div>

          <div class="card-body">
            <div class="row">
              <span class="label">时间</span>
              <span class="value">{{ item.start_time }} - {{ item.end_time }}</span>
            </div>
            <div class="row">
              <span class="label">节次</span>
              <span class="value">{{ formatPeriods(item.period_ids) }}</span>
            </div>
            <div class="row">
              <span class="label">活动名称</span>
              <span class="value">{{ item.activity_name }}</span>
            </div>
            <div class="row">
              <span class="label">活动类型</span>
              <span class="value">{{ item.activity_type }}</span>
            </div>
            <div class="row">
              <span class="label">参与人数</span>
              <span class="value">{{ item.participant_count }}</span>
            </div>
            <div class="row">
              <span class="label">用途说明</span>
              <span class="value">{{ item.purpose || '—' }}</span>
            </div>
            <div class="row">
              <span class="label">提交时间</span>
              <span class="value">{{ formatDateTime(item.submitted_at) }}</span>
            </div>
          </div>

          <!-- 操作区：查看详情 / 取消预约 -->
          <div class="card-actions">
            <button class="btn-outline" @click="openDetail(item.reservation_id)">查看详情</button>
            <button class="btn-danger" :disabled="!canCancel(item.status)"
              @click="cancelReservation(item.reservation_id)">
              取消预约
            </button>
          </div>
        </div>
      </div>

      <!-- 分页区域 -->
      <div v-if="filteredReservations.length" class="pagination">
        <span class="page-info">共 {{ filteredReservations.length }} 条</span>
        <select v-model.number="pageSize">
          <option :value="5">5 条/页</option>
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
        </select>
        <button class="page-btn" :disabled="page === 1" @click="page--">上一页</button>
        <span class="page-num">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page === totalPages" @click="page++">下一页</button>
      </div>
    </div>
    <!-- 详情弹窗（简易版） -->
    <div v-if="detailVisible" class="detail-mask" @click.self="detailVisible = false">
      <div class="detail-panel">
        <h3>预约详情</h3>
        <div v-if="detailLoading" class="state">加载中...</div>
        <div v-else-if="detailError" class="state error">{{ detailError }}</div>
        <div v-else-if="detail" class="detail-body">
          <div class="row"><span class="label">教室</span><span class="value">{{ getClassroomName(detail.classroom_id)
              }}</span></div>
          <div class="row"><span class="label">日期</span><span class="value">{{ formatDate(detail.date) }}</span></div>
          <div class="row"><span class="label">时间</span><span class="value">{{ detail.start_time }} - {{ detail.end_time
              }}</span></div>
          <div class="row"><span class="label">节次</span><span class="value">{{ formatPeriods(detail.period_ids)
              }}</span>
          </div>
          <div class="row"><span class="label">活动名称</span><span class="value">{{ detail.activity_name }}</span></div>
          <div class="row"><span class="label">活动类型</span><span class="value">{{ detail.activity_type }}</span></div>
          <div class="row"><span class="label">参与人数</span><span class="value">{{ detail.participant_count }}</span>
          </div>
          <div class="row"><span class="label">用途说明</span><span class="value">{{ detail.purpose || '—' }}</span></div>
          <div class="row"><span class="label">状态</span><span class="value">{{ detail.status }}</span></div>
          <div class="row"><span class="label">提交时间</span><span class="value">{{ formatDateTime(detail.submitted_at)
              }}</span></div>
        </div>
        <div class="detail-actions">
          <button class="btn" @click="detailVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 我的预约页面
 * 目标：展示当前用户的预约记录（需登录）
 * 做法：
 * 1) 拉取预约列表 /reservations/my
 * 2) 拉取教室列表 /classrooms（用于显示教室名称）
 * 3) 在前端格式化节次与时间字段
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import request from '@/utils/request'
import NavBar from '@/components/NavBar.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const reservations = ref([])
const classrooms = ref([])
const loading = ref(false)
const error = ref('')

// 日期格式化工具
const formatDate = (dateStr) => {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 详情弹窗状态
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref(null)

// ==================== 筛选与分页 ====================
const filters = ref({
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})

const statusOptions = ref([])
const page = ref(1)
const pageSize = ref(10)

// 过滤后的预约列表
const filteredReservations = computed(() => {
  const key = filters.value.keyword.trim().toLowerCase()
  return reservations.value.filter(item => {
    const classroomName = getClassroomName(item.classroom_id).toLowerCase()
    const matchKeyword = !key || item.activity_name?.toLowerCase().includes(key) || classroomName.includes(key)
    const matchStatus = !filters.value.status || item.status === filters.value.status

    const itemDate = new Date(item.date)
    const startDate = filters.value.startDate ? new Date(filters.value.startDate) : null
    const endDate = filters.value.endDate ? new Date(filters.value.endDate) : null

    const matchStart = !startDate || itemDate >= startDate
    const matchEnd = !endDate || itemDate <= endDate

    return matchKeyword && matchStatus && matchStart && matchEnd
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredReservations.value.length / pageSize.value)))

const paginatedReservations = computed(() => {
  const startIndex = (page.value - 1) * pageSize.value
  return filteredReservations.value.slice(startIndex, startIndex + pageSize.value)
})

// 拉取数据：先拿预约列表，再拿教室列表用于显示
const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    // 同时请求：预约列表 + 教室列表（用于展示教室名）
    const [reservationRes, classroomRes] = await Promise.all([
      request.get('/reservations/my'),
      request.get('/classrooms')
    ])

    reservations.value = Array.isArray(reservationRes?.data) ? reservationRes.data : []
    classrooms.value = Array.isArray(classroomRes) ? classroomRes : []
    statusOptions.value = Array.from(new Set(reservations.value.map(item => item.status).filter(Boolean)))
  } catch (err) {
    error.value = '获取预约记录失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

// 是否允许取消：已取消/已驳回/已过期不允许
const canCancel = (status) => !['已取消', '已驳回', '已过期'].includes(status)

// 查看详情：走后端接口，确保数据实时
const openDetail = async (id) => {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    const res = await request.get(`/reservations/${id}`)
    detail.value = res?.data || null
  } catch (err) {
    detailError.value = '获取详情失败，请稍后再试'
  } finally {
    detailLoading.value = false
  }
}

// 取消预约：弹窗确认后调用后端
const cancelReservation = async (id) => {
  try {
    await ElMessageBox.confirm('确定要取消该预约吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.patch(`/reservations/${id}/cancel`)
    ElMessage.success('预约已取消')
    fetchData()
  } catch {
    // 用户取消或接口失败
  }
}

// 教室名称展示：有 building+room_num 就拼接，否则回退到教室ID
const getClassroomName = (classroomId) => {
  const item = classrooms.value.find(c => String(c.classroomId) === String(classroomId))
  return item ? `${item.building}${item.roomNum}` : `教室ID：${classroomId}`
}

// 格式化节次：period_ids 为 JSON/数组/字符串三种可能
const formatPeriods = (periodIds) => {
  let ids = []
  if (Array.isArray(periodIds)) ids = periodIds
  else if (typeof periodIds === 'string') {
    try {
      ids = JSON.parse(periodIds)
    } catch (err) {
      ids = []
    }
  }
  if (!ids.length) return '—'
  return ids.map(id => `第${id}节`).join('，')
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getStatusClass = (status) => {
  if (status === '已通过') return 'approved'
  if (status === '待审批') return 'pending'
  if (status === '已驳回') return 'rejected'
  return 'normal'
}

const resetFilters = () => {
  filters.value = { keyword: '', status: '', startDate: '', endDate: '' }
  page.value = 1
}


onMounted(() => {
  fetchData()
})

// 分页与筛选联动：筛选变更时回到第一页
watch([filters, pageSize], () => {
  page.value = 1
}, { deep: true })

// 选定开始日期后，结束日期默认同步为开始日期
watch(() => filters.value.startDate, (value) => {
  if (value && !filters.value.endDate) {
    filters.value.endDate = value
  }
})
</script>

<style scoped>
.my-reservations {
  height: 100%;
  background: #f0f4f8;
}

.content {
  max-width: 1000px;
  margin: 40px auto;
  /* 上下 左 右 内边距 */
  padding: 0 40px 40px;
}

.header h1 {
  margin: 0 0 8px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.btn {
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin: 16px 0 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.filter-item label {
  font-size: 12px;
  color: #8a94a6;
}

.filter-item input,
.filter-item select {
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 10px;
  background: #f8fafc;
}

.reset-btn {
  height: 36px;
  padding: 0 16px;
  border: none;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 8px;
  cursor: pointer;
}

.state {
  padding: 40px;
  text-align: center;
  color: #666;
}

.state.error {
  color: #f56c6c;
}

.list {
  display: grid;
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room {
  font-weight: 600;
}

.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #f0f0f0;
}

.status.approved {
  background: #e1f3d8;
  color: #67c23a;
}

.status.pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.status.rejected {
  background: #fde2e2;
  color: #f56c6c;
}

.card-body {
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.btn-outline {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #374151;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger:disabled {
  cursor: not-allowed;
  color: #9ca3af;
  border-color: #e5e7eb;
  background: #f3f4f6;
}

.row {
  display: flex;
  gap: 10px;
}

.label {
  color: #666;
  min-width: 70px;
}

.value {
  color: #333;
}

.pagination {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.page-info {
  color: #666;
  font-size: 12px;
}

.page-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.page-btn:disabled {
  cursor: not-allowed;
  color: #9ca3af;
}

.page-num {
  font-size: 12px;
  color: #4b5563;
}

.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.detail-panel {
  width: 520px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
}

.detail-panel h3 {
  margin: 0 0 12px;
}

.detail-body {
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
