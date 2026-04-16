<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>系统公告</h2>
          <div class="actions">
            <el-input v-model="query.keyword" placeholder="公告标题/内容" clearable class="search-input"
              @keyup.enter="handleSearch" />
            <el-select v-model="query.isActive" placeholder="状态" clearable class="filter-select">
              <el-option label="正常展示" value="1" />
              <el-option label="已下架" value="0" />
            </el-select>
            <el-select v-model="query.isTop" placeholder="置顶" clearable class="filter-select">
              <el-option label="置顶" value="1" />
              <el-option label="不置顶" value="0" />
            </el-select>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-button @click="triggerImport">导入CSV</el-button>
            <el-button @click="exportCsv">导出CSV</el-button>
            <el-button type="primary" @click="openCreate">发布公告</el-button>
            <el-button @click="fetchList">刷新</el-button>
          </div>
        </div>

        <el-table :data="tableData" v-loading="loading" border stripe class="table">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column prop="publishTime" label="发布时间" min-width="170">
            <template #default="scope">
              {{ formatTime(scope.row.publishTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="expireTime" label="过期时间" min-width="170">
            <template #default="scope">
              {{ scope.row.expireTime || '长期有效' }}
            </template>
          </el-table-column>
          <el-table-column label="置顶" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.isTop ? 'warning' : 'info'">
                {{ scope.row.isTop ? '置顶' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.isActive ? 'success' : 'info'">
                {{ scope.row.isActive ? '正常' : '下架' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="viewCount" label="浏览量" width="100" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button class="action-btn edit-btn" link @click="openEdit(scope.row)">编辑</el-button>
              <el-button class="action-btn delete-btn" link @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <AppPagination v-if="total > 0" :page="page" :total="total" :page-size="pageSize" @change="fetchList" />
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker v-model="form.expireTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="不填则长期有效" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="form.isTop" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.isActive" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <input ref="fileInput" type="file" accept=".csv" class="hidden-file" @change="handleImportFile" />
  </div>
</template>

<script setup>
/**
 * NoticeList - 管理员系统公告管理
 * 功能：公告列表、查询、分页、发布、编辑、删除
 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import AppPagination from '@/components/AppPagination.vue'

const query = reactive({
  keyword: '',
  isActive: '',
  isTop: ''
})

const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const dialogVisible = ref(false)
const dialogTitle = ref('发布公告')
const isEdit = ref(false)
const formRef = ref(null)
const fileInput = ref(null)
const form = reactive({
  id: '',
  title: '',
  content: '',
  expireTime: '',
  isTop: 0,
  isActive: 1
})

const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

const normalizeRow = (row) => {
  return {
    id: row.announcement_id ?? row.announcementId ?? row.id,
    title: row.title,
    content: row.content,
    publishTime: row.publish_time ?? row.publishTime,
    expireTime: row.expire_time ?? row.expireTime,
    isTop: Number(row.is_top ?? row.isTop ?? 0),
    isActive: Number(row.is_active ?? row.isActive ?? 1),
    viewCount: Number(row.view_count ?? row.viewCount ?? 0)
  }
}

// 将 ISO 时间或时间戳格式化为 
const formatTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return String(time)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/announcements/admin', {
      params: {
        keyword: query.keyword || undefined,
        isActive: query.isActive !== '' ? query.isActive : undefined,
        isTop: query.isTop !== '' ? query.isTop : undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    tableData.value = Array.isArray(res?.data) ? res.data.map(normalizeRow) : []
    total.value = res.pagination?.total || 0
  } finally {
    loading.value = false
  }
}

fetchList()

const handleSearch = () => {
  page.value = 1
  fetchList()
}

const handleReset = () => {
  query.keyword = ''
  query.isActive = ''
  query.isTop = ''
  page.value = 1
  fetchList()
}

const openCreate = () => {
  isEdit.value = false
  dialogTitle.value = '发布公告'
  dialogVisible.value = true
  Object.assign(form, {
    id: '',
    title: '',
    content: '',
    expireTime: '',
    isTop: 0,
    isActive: 1
  })
}

const openEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑公告'
  dialogVisible.value = true
  Object.assign(form, {
    id: row.id,
    title: row.title,
    content: row.content,
    expireTime: row.expireTime || '',
    isTop: row.isTop,
    isActive: row.isActive
  })
}

const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return

    const payload = {
      title: form.title,
      content: form.content,
      expireTime: form.expireTime || null,
      isTop: form.isTop,
      isActive: form.isActive
    }

    if (isEdit.value) {
      await request.put(`/announcements/${form.id}`, payload)
      ElMessage.success('公告更新成功')
    } else {
      await request.post('/announcements', payload)
      ElMessage.success('公告发布成功')
    }

    dialogVisible.value = false
    fetchList()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除公告“${row.title}”吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await request.delete(`/announcements/${row.id}`)
    ElMessage.success('公告删除成功')
    fetchList()
  })
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
  const headers = ['title', 'content', 'expireTime', 'isTop', 'isActive', 'publishTime', 'viewCount']
  const rows = tableData.value.map(item => [
    item.title,
    item.content,
    item.expireTime || '',
    item.isTop,
    item.isActive,
    formatTime(item.publishTime),
    item.viewCount
  ])
  downloadCsv('系统公告', headers, rows)
}

const downloadTemplate = () => {
  const headers = ['title', 'content', 'expireTime', 'isTop', 'isActive']
  downloadCsv('公告导入模板', headers, [])
}

const triggerImport = () => {
  if (!fileInput.value) return
  fileInput.value.value = ''
  fileInput.value.click()
}

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
    if (char === '\r') continue
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
    标题: 'title',
    内容: 'content',
    过期时间: 'expireTime',
    置顶: 'isTop',
    状态: 'isActive'
  }
  return map[trimmed] || trimmed
}

const toTinyInt = (value, fallback = 0) => {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return fallback
  if (['1', 'true', 'yes', 'y', '是', '置顶', '正常'].includes(text)) return 1
  if (['0', 'false', 'no', 'n', '否', '不置顶', '下架'].includes(text)) return 0
  return fallback
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
        return item
      })

    if (!items.length) {
      ElMessage.warning('没有可导入的数据')
      return
    }

    let successCount = 0
    const errors = []

    for (let i = 0; i < items.length; i += 1) {
      const row = items[i]
      const payload = {
        title: String(row.title || '').trim(),
        content: String(row.content || '').trim(),
        expireTime: String(row.expireTime || '').trim() || null,
        isTop: toTinyInt(row.isTop, 0),
        isActive: toTinyInt(row.isActive, 1)
      }

      if (!payload.title || !payload.content) {
        errors.push(`第${i + 2}行：标题或内容为空`)
        continue
      }

      try {
        await request.post('/announcements', payload)
        successCount += 1
      } catch (error) {
        const msg = error?.response?.data?.msg || '导入失败'
        errors.push(`第${i + 2}行：${msg}`)
      }
    }

    if (successCount) {
      ElMessage.success(`导入成功：${successCount} 条`)
      fetchList()
    }

    if (errors.length) {
      ElMessageBox.alert(errors.slice(0, 10).join('<br/>'), `导入失败 ${errors.length} 条`, {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '知道了'
      })
    }
  } catch (error) {
    ElMessage.error('导入失败')
  }
}
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
  width: 140px;
}

.table {
  width: 100%;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
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
