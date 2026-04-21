<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>课程管理</h2>
          <div class="actions">
            <el-input v-model="keyword" placeholder="按课程/教师/班级/教室搜索" clearable class="search-input"
              @keyup.enter="fetchSchedules" />
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-button @click="triggerImport">导入CSV</el-button>
            <el-button @click="exportCsv">导出CSV</el-button>
            <el-button type="primary" @click="openCreateDialog">新增课程</el-button>
          </div>
        </div>

        <!-- 课程列表 -->
        <el-table :data="schedules" stripe border v-loading="loading" class="table">
          <el-table-column prop="scheduleId" label="序号" width="80" />
          <el-table-column prop="courseName" label="课程名称" min-width="160" />
          <el-table-column prop="teacherName" label="授课教师" min-width="120" />
          <el-table-column prop="className" label="班级" min-width="140" />
          <el-table-column label="教室名称" min-width="120">
            <template #default="scope">
              {{ getClassroomName(scope.row.classroomId) }}
            </template>
          </el-table-column>
          <el-table-column prop="periodId" label="节次" width="80" />
          <el-table-column prop="weekday" label="星期" width="90">
            <template #default="scope">
              {{ weekdayLabel(scope.row.weekday) }}
            </template>
          </el-table-column>
          <el-table-column prop="startWeek" label="起始周" width="90" />
          <el-table-column prop="endWeek" label="结束周" width="90" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button class="action-btn edit-btn" link @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button class="action-btn delete-btn" link @click="confirmDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="720px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="教室ID" required>
          <el-input-number v-model="form.classroomId" :min="1" />
        </el-form-item>
        <el-form-item label="课程名称" required>
          <el-input v-model="form.courseName" placeholder="例如：数据库原理" />
        </el-form-item>
        <el-form-item label="教师ID">
          <el-input-number v-model="form.teacherId" :min="1" />
        </el-form-item>
        <el-form-item label="教师姓名" required>
          <el-input v-model="form.teacherName" placeholder="例如：张老师" />
        </el-form-item>
        <el-form-item label="节次ID" required>
          <el-input-number v-model="form.periodId" :min="1" />
        </el-form-item>
        <el-form-item label="班级" required>
          <el-input v-model="form.className" placeholder="例如：计科2101" />
        </el-form-item>
        <el-form-item label="星期" required>
          <el-select v-model="form.weekday" placeholder="选择星期">
            <el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始周" required>
          <el-input-number v-model="form.startWeek" :min="1" />
        </el-form-item>
        <el-form-item label="结束周" required>
          <el-input-number v-model="form.endWeek" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件上传输入 -->
    <input ref="fileInput" type="file" accept=".csv" class="hidden-file" @change="handleImportFile" />
  </div>
</template>

<script setup>
/**
 * 课程管理页面（管理员）
 * - 列表查询 + 关键词筛选
 * - 新增 / 编辑 / 删除
 * - CSV 导入 / 导出
 */
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const schedules = ref([])
const classroomNameMap = ref({})
const loading = ref(false)
const keyword = ref('')

const dialogVisible = ref(false)
const fileInput = ref(null)

const form = ref({
  scheduleId: null,
  classroomId: 1,
  courseName: '',
  teacherId: null,
  teacherName: '',
  periodId: 1,
  className: '',
  weekday: 1,
  startWeek: 1,
  endWeek: 1
})

const dialogTitle = computed(() => (form.value.scheduleId ? '编辑课程' : '新增课程'))

const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
]

const weekdayLabel = (value) => {
  const found = weekdayOptions.find(item => item.value === Number(value))
  return found ? found.label : `周${value || '-'}`
}

const getClassroomName = (classroomId) => {
  const text = classroomNameMap.value[String(classroomId)]
  return text || `教室ID:${classroomId || '-'}`
}

// 初始化表单
const resetForm = () => {
  form.value = {
    scheduleId: null,
    classroomId: 1,
    courseName: '',
    teacherId: null,
    teacherName: '',
    periodId: 1,
    className: '',
    weekday: 1,
    startWeek: 1,
    endWeek: 1
  }
}

// 获取课程列表（支持关键词）
const fetchSchedules = async () => {
  loading.value = true
  try {
    const res = await request.get('/course-schedule', {
      params: keyword.value ? { keyword: keyword.value } : {}
    })
    schedules.value = Array.isArray(res) ? res : []
  } catch (error) {
    ElMessage.error('获取课程列表失败')
  } finally {
    loading.value = false
  }
}

const fetchClassroomNameMap = async () => {
  try {
    const res = await request.get('/classrooms')
    const list = Array.isArray(res) ? res : []
    const map = {}
    list.forEach(item => {
      const id = item?.classroomId
      if (!id) return
      map[String(id)] = `${item?.building || ''}${item?.roomNum || ''}` || `教室${id}`
    })
    classroomNameMap.value = map
  } catch (error) {
    classroomNameMap.value = {}
  }
}

const openCreateDialog = () => {
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  form.value = {
    scheduleId: row.scheduleId,
    classroomId: row.classroomId,
    courseName: row.courseName,
    teacherId: row.teacherId || null,
    teacherName: row.teacherName,
    periodId: row.periodId,
    className: row.className,
    weekday: Number(row.weekday || 1),
    startWeek: Number(row.startWeek || 1),
    endWeek: Number(row.endWeek || 1)
  }
  dialogVisible.value = true
}

// 表单校验：必填 + 周次范围
const validateForm = () => {
  const data = form.value
  if (!data.classroomId || !data.courseName || !data.teacherName || !data.periodId || !data.className) {
    ElMessage.warning('请填写必填项')
    return false
  }
  if (Number(data.weekday) < 1 || Number(data.weekday) > 7) {
    ElMessage.warning('星期范围应为 1-7')
    return false
  }
  if (Number(data.startWeek) > Number(data.endWeek)) {
    ElMessage.warning('起始周不能大于结束周')
    return false
  }
  return true
}

const submitForm = async () => {
  if (!validateForm()) return

  const payload = {
    classroomId: form.value.classroomId,
    courseName: form.value.courseName,
    teacherId: form.value.teacherId,
    teacherName: form.value.teacherName,
    periodId: form.value.periodId,
    className: form.value.className,
    weekday: form.value.weekday,
    startWeek: form.value.startWeek,
    endWeek: form.value.endWeek
  }

  try {
    if (form.value.scheduleId) {
      await request.put(`/course-schedule/${form.value.scheduleId}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/course-schedule', payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchSchedules()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const confirmDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除课程【${row.courseName}】吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/course-schedule/${row.scheduleId}`)
    ElMessage.success('删除成功')
    fetchSchedules()
  } catch (error) {
    // 取消或失败均不处理
  }
}

// ==================== CSV 导出 ====================
const downloadCsv = (filename, headers, rows) => {
  // 处理单元格内容中的逗号/引号/换行
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

const exportCsv = () => {
  const headers = ['classroomId', 'courseName', 'teacherId', 'teacherName', 'periodId', 'className', 'weekday', 'startWeek', 'endWeek']
  const rows = schedules.value.map(item => [
    item.classroomId,
    item.courseName,
    item.teacherId,
    item.teacherName,
    item.periodId,
    item.className,
    item.weekday,
    item.startWeek,
    item.endWeek
  ])
  downloadCsv('课程列表', headers, rows)
}

const downloadTemplate = () => {
  const headers = ['classroomId', 'courseName', 'teacherId', 'teacherName', 'periodId', 'className', 'weekday', 'startWeek', 'endWeek']
  downloadCsv('课程导入模板', headers, [])
}

// ==================== CSV 导入 ====================
const triggerImport = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

// 简易 CSV 解析（支持双引号包裹、双引号转义）
const parseCsv = (text) => {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        value += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(value)
      value = ''
      continue
    }

    if (char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    value += char
  }

  if (value.length || row.length) {
    row.push(value)
    rows.push(row)
  }

  return rows
}

const normalizeHeaderKey = (key) => {
  const trimmed = String(key || '').trim()
  const map = {
    教室ID: 'classroomId',
    课程名称: 'courseName',
    教师ID: 'teacherId',
    教师姓名: 'teacherName',
    节次ID: 'periodId',
    班级名称: 'className',
    星期: 'weekday',
    起始周: 'startWeek',
    结束周: 'endWeek'
  }
  return map[trimmed] || trimmed
}

const handleImportFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const rows = parseCsv(text)

    if (rows.length < 2) {
      ElMessage.warning('CSV 内容为空')
      return
    }

    const headers = rows[0].map(normalizeHeaderKey)
    const items = rows.slice(1)
      .filter(row => row.some(cell => String(cell || '').trim() !== ''))
      .map(row => {
        const item = {}
        headers.forEach((key, index) => {
          item[key] = row[index]
        })
        return {
          classroomId: Number(item.classroomId || 0),
          courseName: String(item.courseName || '').trim(),
          teacherId: item.teacherId ? Number(item.teacherId) : null,
          teacherName: String(item.teacherName || '').trim(),
          periodId: Number(item.periodId || 0),
          className: String(item.className || '').trim(),
          weekday: Number(item.weekday || 0),
          startWeek: Number(item.startWeek || 0),
          endWeek: Number(item.endWeek || 0)
        }
      })

    if (!items.length) {
      ElMessage.warning('没有可导入的数据')
      return
    }

    await request.post('/course-schedule/import', { items })
    ElMessage.success(`导入成功：${items.length} 条`)
    fetchSchedules()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || '导入失败')
  }
}

onMounted(() => {
  fetchClassroomNameMap()
  fetchSchedules()
})
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
}

.search-input {
  width: 240px;
}

.table {
  width: 100%;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.edit-btn {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.12);
}

.edit-btn:hover {
  background: rgba(22, 119, 255, 0.2);
}

.delete-btn {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.12);
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.2);
}

.hidden-file {
  display: none;
}
</style>
