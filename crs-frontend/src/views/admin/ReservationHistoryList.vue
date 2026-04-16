<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>历史预约管理</h2>
          <div class="actions">
            <!-- 关键词支持活动名称、申请人、教室位置 -->
            <el-input v-model="query.keyword" placeholder="活动名称/申请人/教室" clearable class="search-input"
              @keyup.enter="handleSearch" />

            <!-- 状态筛选，便于快速查看某类预约记录 -->
            <el-select v-model="query.status" placeholder="状态" clearable class="filter-select">
              <el-option label="待审批" value="待审批" />
              <el-option label="已通过" value="已通过" />
              <el-option label="已驳回" value="已驳回" />
              <el-option label="已取消" value="已取消" />
            </el-select>

            <!-- 日期区间筛选：按预约日期过滤 -->
            <el-date-picker v-model="query.startDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期"
              class="date-picker" />
            <el-date-picker v-model="query.endDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期"
              class="date-picker" />

            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button @click="exportCsv">导出CSV</el-button>
            <el-button @click="fetchList">刷新</el-button>
          </div>
        </div>

        <!-- 只读表格：无编辑/删除操作 -->
        <el-table :data="tableData" v-loading="loading" border stripe class="table">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="classroomName" label="教室" min-width="100" />
          <el-table-column prop="applicantName" label="申请人" min-width="100" />
          <el-table-column prop="approverName" label="审批人" min-width="100" />
          <el-table-column prop="activityName" label="活动名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="activityType" label="活动类型" width="100" />
          <el-table-column prop="reservationDate" label="预约日期" width="120" />
          <el-table-column prop="timeRange" label="时段" min-width="120" />
          <el-table-column prop="participantCount" label="人数" width="60" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="statusTag(scope.row.status)">{{ scope.row.status || '未知' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" min-width="120" />
          <el-table-column prop="approvedAt" label="通过时间" min-width="120" />
          <el-table-column prop="rejectedAt" label="驳回/取消时间" min-width="120" />
        </el-table>

        <div class="pager">
          <AppPagination v-if="total > 0" :page="page" :total="total" :page-size="pageSize" @change="fetchList" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ReservationHistoryList - 管理员历史预约管理（只读）
 *
 * 设计目标：
 * 1. 风格与信息管理下其他列表页保持一致
 * 2. 仅提供查看能力，不提供新增/编辑/删除
 * 3. 支持分页与常用筛选，便于管理员回溯历史预约
 */
import { reactive, ref } from 'vue'
import request from '@/utils/request'
import AppPagination from '@/components/AppPagination.vue'

// 查询条件：与后端接口 query 参数保持一致
const query = reactive({
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})

// 表格与分页状态
const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 将后端返回的原始行映射成前端展示友好的结构
const normalizeRow = (row) => {
  const applicantName = row.applicant_name ?? row.applicantName ?? '--'
  const approverName = row.approver_name ?? row.approverName ?? '--'
  const building = row.building || ''
  const roomNum = row.room_num || row.roomNum || ''
  const classroomName = building || roomNum ? `${building}${roomNum}` : `教室ID：${row.classroom_id}`

  const dateText = formatDateOnly(row.date)
  const startTime = formatTimeOnly(row.start_time)
  const endTime = formatTimeOnly(row.end_time)

  return {
    classroomName,
    applicantName,
    approverName,
    activityName: row.activity_name ?? row.activityName ?? '--',
    activityType: row.activity_type ?? row.activityType ?? '--',
    reservationDate: dateText,
    timeRange: startTime && endTime ? `${startTime} - ${endTime}` : '--',
    participantCount: Number(row.participant_count ?? row.participantCount ?? 0),
    status: row.status || '--',
    submittedAt: formatDateTime(row.submitted_at ?? row.submittedAt),
    approvedAt: formatDateTime(row.approved_at ?? row.approvedAt),
    rejectedAt: formatDateTime(row.rejected_at ?? row.rejectedAt)
  }
}

// 日期字段格式化为 YYYY-MM-DD
const formatDateOnly = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// 时间字段格式化为 HH:mm
const formatTimeOnly = (value) => {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

// 时间戳格式化为 YYYY-MM-DD HH:mm
const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// 状态标签颜色：沿用后台常见语义色
const statusTag = (status) => {
  if (status === '已通过') return 'success'
  if (status === '待审批') return 'warning'
  if (status === '已驳回' || status === '已取消') return 'danger'
  return 'info'
}

// 拉取分页列表
const fetchList = async (newPage) => {
  if (typeof newPage === 'number') {
    page.value = newPage
  }

  loading.value = true
  try {
    const res = await request.get('/reservations/admin/history', {
      params: {
        keyword: query.keyword || undefined,
        status: query.status || undefined,
        startDate: query.startDate || undefined,
        endDate: query.endDate || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })

    const rows = Array.isArray(res?.data) ? res.data : []
    tableData.value = rows.map(normalizeRow)
    total.value = Number(res?.pagination?.total || 0)
  } finally {
    loading.value = false
  }
}

// 执行查询：重置到第一页
const handleSearch = () => {
  page.value = 1
  fetchList()
}

// 清空条件并回到第一页
const handleReset = () => {
  query.keyword = ''
  query.status = ''
  query.startDate = ''
  query.endDate = ''
  page.value = 1
  fetchList()
}

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
  const csv = `\uFEFF${[headerLine, ...bodyLines].join('\n')}`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportCsv = () => {
  const headers = ['classroomName', 'applicantName', 'approverName', 'activityName', 'activityType', 'reservationDate', 'timeRange', 'participantCount', 'status', 'submittedAt', 'approvedAt', 'rejectedAt']
  const rows = tableData.value.map(item => [
    item.classroomName,
    item.applicantName,
    item.approverName,
    item.activityName,
    item.activityType,
    item.reservationDate,
    item.timeRange,
    item.participantCount,
    item.status,
    item.submittedAt,
    item.approvedAt,
    item.rejectedAt
  ])
  downloadCsv('历史预约', headers, rows)
}

// 首次进入页面时自动加载
fetchList()
</script>

<style scoped>
.content-wrapper {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  width: 220px;
}

.filter-select {
  width: 130px;
}

.date-picker {
  width: 150px;
}

.table {
  width: 100%;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
