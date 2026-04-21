<template>
  <div class="approval-page">
    <!-- 顶部导航 -->
    <NavBar v-model="keyword" :show-search="true" :show-approval-link="false" @search="handleSearch" />
    <div class="content">
      <div class="header">
        <h1>审批管理</h1>
        <p>处理学生预约申请并查看审批记录。</p>
      </div>

      <!-- 视图切换：审批管理 / 审批历史（ECharts） -->
      <div class="view-switch">
        <button class="switch-btn" :class="{ active: viewMode === 'manage' }" @click="viewMode = 'manage'">
          审批管理
        </button>
        <button class="switch-btn" :class="{ active: viewMode === 'history' }" @click="viewMode = 'history'">
          审批历史数据
        </button>
      </div>

      <!-- 审批管理视图：统计 + 列表 -->
      <template v-if="viewMode === 'manage'">
        <!-- 统计卡片 -->
        <div class="stats">
          <div class="stat-card" :class="{ active: isStatActive('待审批') }" @click="handleStatClick('待审批')">
            <div class="stat-label">待审批</div>
            <div class="stat-value">{{ stats.pending }}</div>
          </div>
          <div class="stat-card" :class="{ active: isStatActive('已通过') }" @click="handleStatClick('已通过')">
            <div class="stat-label">已通过</div>
            <div class="stat-value">{{ stats.approved }}</div>
          </div>
          <div class="stat-card" :class="{ active: isStatActive('已驳回') }" @click="handleStatClick('已驳回')">
            <div class="stat-label">已驳回</div>
            <div class="stat-value">{{ stats.rejected }}</div>
          </div>
          <div class="stat-card" :class="{ active: isStatActive('') }" @click="handleStatClick('')">
            <div class="stat-label">总计</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </div>

        <!-- 筛选区 -->
        <div class="filter-panel">
          <div class="filter-item">
            <label>关键字</label>
            <input v-model="filters.keyword" type="text" placeholder="活动名称/教室" />
          </div>
          <div class="filter-item">
            <label>状态</label>
            <select v-model="filters.status">
              <option value="">全部</option>
              <option value="待审批">待审批</option>
              <option value="已通过">已通过</option>
              <option value="已驳回">已驳回</option>
            </select>
          </div>
          <button class="reset-btn" @click="resetFilters">清空筛选</button>
          <button class="btn" @click="reload">刷新</button>
        </div>

        <!-- 列表 -->
        <div v-if="loading" class="state">加载中...</div>
        <div v-else-if="error" class="state error">{{ error }}</div>
        <div v-else-if="!filteredList.length" class="state">暂无数据</div>

        <div v-else class="list">
          <div v-for="item in filteredList" :key="item.reservation_id" class="card">
            <div class="card-header">
              <div class="title">
                <span class="room">{{ formatRoom(item) }}</span>
                <span class="status" :class="statusClass(item.status)">{{ item.status }}</span>
              </div>
              <div class="meta">申请人：{{ item.applicant_name || '—' }}</div>
            </div>
            <div class="card-body">
              <div class="row"><span class="label">日期</span><span class="value">{{ formatDate(item.date) }}</span></div>
              <div class="row"><span class="label">时间</span><span class="value">{{ item.start_time }} - {{ item.end_time
              }}</span></div>
              <div class="row"><span class="label">活动</span><span class="value">{{ item.activity_name }}</span></div>
              <div class="row"><span class="label">类型</span><span class="value">{{ item.activity_type }}</span></div>
              <div class="row"><span class="label">人数</span><span class="value">{{ item.participant_count }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn-outline" @click="goDetail(item.reservation_id)">查看详情</button>
              <button class="btn" :disabled="item.status !== '待审批'" @click="approve(item.reservation_id)">通过</button>
              <button class="btn-danger" :disabled="item.status !== '待审批'"
                @click="reject(item.reservation_id)">驳回</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 审批历史视图：ECharts 数据可视化 -->
      <template v-else>
        <!-- ECharts 容器：使用 vue-echarts 组件 -->
        <div class="chart-wrapper">
          <!-- ECharts 图表独立组件，便于维护 -->
          <ApprovalHistoryChart :records="list" :room-formatter="formatRoom" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * 审批管理页
 * - 待审批列表 /approvals/pending
 * - 审批记录 /approvals/records
 * - 审批统计 /approvals/stats
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import dayjs from 'dayjs'
import ApprovalHistoryChart from '@/components/ApprovalHistoryChart.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const error = ref('')
const stats = ref({ pending: 0, approved: 0, rejected: 0, total: 0 })
const list = ref([])
const keyword = ref('')
// 视图模式：manage=审批管理，history=审批历史
const viewMode = ref('manage')

const filters = ref({
  keyword: '',
  status: ''
})

const filteredList = computed(() => {
  const key = filters.value.keyword.trim().toLowerCase()
  return list.value.filter(item => {
    const roomName = formatRoom(item).toLowerCase()
    const matchKeyword = !key || item.activity_name?.toLowerCase().includes(key) || roomName.includes(key)
    const matchStatus = !filters.value.status || item.status === filters.value.status
    return matchKeyword && matchStatus
  })
})

// 格式化日期
const formatDate = (dateStr) => {
  return dayjs(dateStr).format('YYYY-MM-DD')
}
// 格式化教室名称
const formatRoom = (item) => `${item.building || ''}${item.room_num || ''}` || `教室${item.classroom_id}`

const statusClass = (status) => {
  if (status === '已通过') return 'approved'
  if (status === '待审批') return 'pending'
  if (status === '已驳回') return 'rejected'
  return 'normal'
}

const resetFilters = () => {
  filters.value = { keyword: '', status: '' }
}

// 统计卡片点击：自动把状态写入筛选条件
const handleStatClick = (status) => {
  // 强制回到“审批管理”视图，确保列表可见
  viewMode.value = 'manage'
  filters.value.status = status
}

// 当前选中的统计卡片（用于高亮）
const isStatActive = (status) => {
  return filters.value.status === status
}

const handleSearch = () => {
  // 搜索跳转由 NavBar 统一处理
}

// 刷新数据
const reload = async () => {
  loading.value = true
  error.value = ''
  try {
    // 并行拉取统计、待审批与审批记录
    const [statsRes, pendingRes, recordRes] = await Promise.all([
      request.get('/approvals/stats'),
      request.get('/approvals/pending'),
      request.get('/approvals/records')
    ])
    stats.value = statsRes?.data || stats.value
    const pendingList = Array.isArray(pendingRes?.data) ? pendingRes.data : []
    const recordList = Array.isArray(recordRes?.data) ? recordRes.data : []
    list.value = [...pendingList, ...recordList]
  } catch (err) {
    error.value = '获取审批数据失败'
  } finally {
    loading.value = false
  }
}

const goDetail = (id) => {
  router.push(`/approval/${id}`)
}

const approve = async (id) => {
  try {
    await ElMessageBox.confirm('确认通过该预约吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.post(`/approvals/${id}/submit`, { result: '通过' })
    ElMessage.success('已通过')
    reload()
  } catch {
    // 用户取消或失败
  }
}

const reject = async (id) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回理由', '驳回预约', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await request.post(`/approvals/${id}/submit`, { result: '驳回', reason: value || '' })
    ElMessage.success('已驳回')
    reload()
  } catch {
    // 用户取消或失败
  }
}

onMounted(() => {
  reload()
})
</script>

<style scoped>
.approval-page {
  min-height: 100vh;
  /* 自适应页面高度（随内容变化） */
  height: auto;
  background: #f0f4f8;
}

.content {
  max-width: 1100px;
  /* 居中对齐 */
  margin: 0 auto;
  margin-top: 32px;
  padding: 0 20px 40px;
  height: auto;
  /* 显式设置为 auto，确保不限制高度 */
  overflow: visible;
}

.header h1 {
  margin: 0 0 8px;
}

/* 视图切换按钮 */
.view-switch {
  display: flex;
  gap: 8px;
  margin: 8px 0 16px;
}

.switch-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.switch-btn.active {
  background: #eafaf1;
  border-color: #2ecc71;
  color: #2ecc71;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 16px 0 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.stat-card.active {
  border-color: #2ecc71;
  box-shadow: 0 10px 20px rgba(46, 204, 113, 0.18);
}

.stat-label {
  font-size: 12px;
  color: #8a94a6;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.chart-wrapper {
  width: 100%;
  height: auto;
  min-height: 0;
}

.chart {
  width: 100%;
  height: 100%;
}


.history-legend {
  display: flex;
  gap: 8px;
}

.history-legend .legend-item {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.history-legend .legend-item.approved {
  background: #e1f3d8;
  color: #67c23a;
}

.history-legend .legend-item.rejected {
  background: #fde2e2;
  color: #f56c6c;
}

.history-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(80px, 1fr));
  gap: 12px;
  align-items: end;
}

.history-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.history-bar {
  height: 120px;
  width: 60px;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
}

.history-bar .bar {
  width: 100%;
}

.history-bar .bar.approved {
  background: #67c23a;
}

.history-bar .bar.rejected {
  background: #f56c6c;
}

.history-date {
  font-size: 12px;
  color: #667085;
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

.btn {
  background: #2ecc71;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
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

.btn-danger:disabled,
.btn:disabled {
  cursor: not-allowed;
  color: #9ca3af;
  border-color: #e5e7eb;
  background: #f3f4f6;
}

@media (max-width: 992px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
