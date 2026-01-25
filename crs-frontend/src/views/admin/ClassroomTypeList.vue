<template>
  <AdminLayout breadcrumb="教室类型">
    <div class="page-card">
      <!-- 工具栏：查询 + 操作 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="query.keyword" placeholder="类型名称 / 描述" clearable @keyup.enter="handleSearch"
            style="width: 240px" />
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="openCreate">新增类型</el-button>
          <el-button @click="fetchList">刷新</el-button>
        </div>
      </div>

      <!-- 类型列表表格 -->
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="typeName" label="类型名称" min-width="160" />
        <el-table-column prop="description" label="描述" min-width="220" />
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
              {{ scope.row.status === 'enabled' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="pager">
        <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :page-size="pageSize"
          :current-page="page" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="类型名称" prop="typeName">
          <el-input v-model="form.typeName" placeholder="如：多媒体教室" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 200px">
            <el-option label="启用" value="enabled" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<script setup>
/**
 * ClassroomTypeList - 教室类型管理
 * 功能：查询、分页、新增、编辑、删除
 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/AdminLayout.vue'
import request from '@/utils/request'

// ==================== 查询条件 ====================
const query = reactive({
  keyword: ''
})

// ==================== 列表数据 ====================
const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// ==================== 弹窗表单 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('新增类型')
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  id: '',
  typeName: '',
  description: '',
  status: 'enabled'
})

// 表单校验规则
const rules = {
  typeName: [{ required: true, message: '请输入类型名称', trigger: 'blur' }]
}

// ==================== 数据请求 ====================
const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/classroom-types', {
      params: {
        keyword: query.keyword || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    tableData.value = res.data || []
    total.value = res.pagination?.total || 0
  } finally {
    loading.value = false
  }
}

// 初始化加载
fetchList()

// ==================== 事件处理 ====================
const handleSearch = () => {
  page.value = 1
  fetchList()
}

const handleReset = () => {
  query.keyword = ''
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

// 打开新增弹窗
const openCreate = () => {
  isEdit.value = false
  dialogTitle.value = '新增类型'
  dialogVisible.value = true
  Object.assign(form, {
    id: '',
    typeName: '',
    description: '',
    status: 'enabled'
  })
}

// 打开编辑弹窗
const openEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑类型'
  dialogVisible.value = true
  Object.assign(form, {
    id: row.id,
    typeName: row.typeName,
    description: row.description,
    status: row.status
  })
}

// 提交表单
const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return

    if (isEdit.value) {
      await request.put(`/classroom-types/${form.id}`, {
        typeName: form.typeName,
        description: form.description,
        status: form.status
      })
      ElMessage.success('更新成功')
    } else {
      await request.post('/classroom-types', {
        typeName: form.typeName,
        description: form.description,
        status: form.status
      })
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    fetchList()
  })
}

// 删除类型
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除“${row.typeName}”吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await request.delete(`/classroom-types/${row.id}`)
    ElMessage.success('删除成功')
    fetchList()
  })
}
</script>

<style scoped>
.page-card {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
