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
            <el-button type="primary" @click="openCreate">发布公告</el-button>
            <el-button @click="fetchList">刷新</el-button>
          </div>
        </div>

        <el-table :data="tableData" v-loading="loading" border stripe class="table">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column prop="publishTime" label="发布时间" min-width="170" />
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
          <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total"
            :page-size="pageSize" :current-page="page" @size-change="handleSizeChange"
            @current-change="handlePageChange" />
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

const handleSizeChange = (size) => {
  pageSize.value = size
  page.value = 1
  fetchList()
}

const handlePageChange = (current) => {
  page.value = current
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
</style>
