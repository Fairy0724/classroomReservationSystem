<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 顶部工具栏：查询 + 操作按钮 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="query.keyword" placeholder="姓名 / 工号 / 手机 / 邮箱" clearable @keyup.enter="handleSearch"
            style="width: 260px" />
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="openCreate">新增教师</el-button>
          <el-button @click="fetchList">刷新</el-button>
        </div>
      </div>

      <!-- 教师列表表格 -->
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="username" label="工号" min-width="140" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="院系" min-width="150">
          <template #default="scope">
            {{ scope.row.departmentName || scope.row.departmentCode || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="scope">
            <el-button class="action-btn edit-btn" link @click="openEdit(scope.row)">编辑</el-button>
            <el-button class="action-btn reset-btn" link @click="handleResetPassword(scope.row)">重置密码</el-button>
            <el-button class="action-btn delete-btn" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="pager">
        <AppPagination v-if="total > 0" :page="page" :total="total" :page-size="pageSize" @change="fetchList" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="工号" prop="username">
          <el-input v-model="form.username" placeholder="请输入教师工号" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入教师姓名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="初始密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="默认建议：123456" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="可选" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="院系编码" prop="department">
          <el-input v-model="form.department" placeholder="如：CS" />
        </el-form-item>
        <el-form-item label="头像URL" prop="avatar">
          <el-input v-model="form.avatar" placeholder="可选" />
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
 * TeacherList - 管理员教师信息管理
 * 功能：查询、分页、新增、编辑、删除、重置密码
 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import AppPagination from '@/components/AppPagination.vue'

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
const dialogTitle = ref('新增教师')
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  userId: '',
  username: '',
  realName: '',
  password: '',
  phone: '',
  email: '',
  department: '',
  avatar: ''
})

// 表单校验规则
const rules = {
  username: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!isEdit.value && !value) return callback(new Error('请输入初始密码'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// ==================== 数据请求 ====================
const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/user/admin/users', {
      params: {
        role: 'teacher',
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

// 打开新增弹窗
const openCreate = () => {
  isEdit.value = false
  dialogTitle.value = '新增教师'
  dialogVisible.value = true
  Object.assign(form, {
    userId: '',
    username: '',
    realName: '',
    password: '',
    phone: '',
    email: '',
    department: '',
    avatar: ''
  })
}

// 打开编辑弹窗
const openEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑教师'
  dialogVisible.value = true
  Object.assign(form, {
    userId: row.userId,
    username: row.username,
    realName: row.realName,
    password: '',
    phone: row.phone || '',
    email: row.email || '',
    department: row.departmentCode || '',
    avatar: row.avatar || ''
  })
}

// 提交表单
const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return

    if (isEdit.value) {
      // 编辑教师
      await request.put(`/user/admin/users/${form.userId}`, {
        username: form.username,
        realName: form.realName,
        phone: form.phone,
        email: form.email,
        department: form.department,
        avatar: form.avatar
      })
      ElMessage.success('更新成功')
    } else {
      // 新增教师
      await request.post('/user/admin/users', {
        username: form.username,
        password: form.password,
        role: 'teacher',
        realName: form.realName,
        phone: form.phone,
        email: form.email,
        department: form.department,
        avatar: form.avatar
      })
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchList()
  })
}

// 删除教师
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除教师“${row.realName || row.username}”吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await request.delete(`/user/admin/users/${row.userId}`)
    ElMessage.success('删除成功')
    fetchList()
  })
}

// 重置密码（默认 123456）
const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确认重置“${row.realName || row.username}”的密码吗？`, '重置密码', {
    type: 'warning'
  }).then(async () => {
    await request.put(`/user/admin/users/${row.userId}/reset-password`)
    ElMessage.success('密码已重置为 123456')
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

.reset-btn {
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.12);
}

.reset-btn:hover {
  background: rgba(250, 140, 22, 0.2);
}

.delete-btn {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.12);
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.2);
}
</style>
