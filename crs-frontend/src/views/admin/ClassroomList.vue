<template>
  <AdminLayout breadcrumb="教室管理">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>教室维护（增删改）</h2>
          <div class="actions">
            <el-input v-model="keyword" placeholder="按名称/位置搜索" clearable class="search-input"
              @keyup.enter="fetchClassrooms" />
            <el-button type="primary" @click="openCreateDialog">新增教室</el-button>
          </div>
        </div>

        <el-table :data="classrooms" stripe border v-loading="loading" class="table">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="教室名称" min-width="160" />
          <el-table-column prop="location" label="位置" min-width="140" />
          <el-table-column prop="capacity" label="容量" width="100" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="statusTag(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button link @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button link type="danger" @click="confirmDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <p class="helper-text">
          注：当前为内存数据示例，后续可替换为数据库持久化。
        </p>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="教室名称" required>
          <el-input v-model="form.name" placeholder="例如：A201 多媒体教室" />
        </el-form-item>
        <el-form-item label="位置" required>
          <el-input v-model="form.location" placeholder="例如：教学楼A-2层" />
        </el-form-item>
        <el-form-item label="容量" required>
          <el-input-number v-model="form.capacity" :min="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="选择状态">
            <el-option label="可预约" value="available" />
            <el-option label="使用中" value="occupied" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.brief" type="textarea" rows="2" placeholder="教室简介" />
        </el-form-item>
        <el-form-item label="主图链接">
          <el-input v-model="form.mainImage" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="图片列表">
          <el-input v-model="form.imagesInput" type="textarea" rows="2" placeholder="多张图片用英文逗号分隔" />
        </el-form-item>
        <el-form-item label="参数">
          <el-input v-model="form.paramsInput" type="textarea" rows="3" placeholder="每行一个参数，格式：键: 值\n示例：设备: 投影仪" />
        </el-form-item>
        <el-form-item label="详情">
          <el-input v-model="form.detail" type="textarea" rows="4" placeholder="支持HTML" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<script setup>
/**
 * 教室管理页面（管理员）
 * - 读取教室列表
 * - 新增 / 编辑 / 删除
 */
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
const classrooms = ref([])
const loading = ref(false)
const keyword = ref('')

const dialogVisible = ref(false)
const form = ref({
  id: null,
  name: '',
  location: '',
  capacity: 1,
  status: 'available',
  brief: '',
  mainImage: '',
  imagesInput: '',
  paramsInput: '',
  detail: ''
})

const dialogTitle = computed(() => (form.value.id ? '编辑教室' : '新增教室'))

const statusText = (status) => {
  const map = {
    available: '可预约',
    occupied: '使用中',
    maintenance: '维护中'
  }
  return map[status] || '未知'
}

const statusTag = (status) => {
  if (status === 'available') return 'success'
  if (status === 'occupied') return 'warning'
  if (status === 'maintenance') return 'danger'
  return 'info'
}

// 解析图片地址（逗号分隔）
const parseImages = (input) => {
  return String(input || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

// 解析参数（每行 key: value）
const parseParams = (input) => {
  return String(input || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [key, ...rest] = line.split(':')
      return {
        key: (key || '').trim(),
        value: rest.join(':').trim()
      }
    })
    .filter(item => item.key)
}

// 初始化表单
const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    location: '',
    capacity: 1,
    status: 'available',
    brief: '',
    mainImage: '',
    imagesInput: '',
    paramsInput: '',
    detail: ''
  }
}

// 获取教室列表（支持关键词）
const fetchClassrooms = async () => {
  loading.value = true
  try {
    const res = await request.get('/classrooms', {
      params: keyword.value ? { keyword: keyword.value } : {}
    })
    classrooms.value = Array.isArray(res) ? res : []
  } catch (error) {
    ElMessage.error('获取教室列表失败')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  form.value = {
    id: row.id,
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    status: row.status,
    brief: row.brief || '',
    mainImage: row.mainImage || '',
    imagesInput: Array.isArray(row.images) ? row.images.join(',') : '',
    paramsInput: Array.isArray(row.params)
      ? row.params.map(item => `${item.key}: ${item.value}`).join('\n')
      : '',
    detail: row.detail || ''
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name || !form.value.location || !form.value.capacity) {
    ElMessage.warning('请填写必填项')
    return
  }

  const payload = {
    name: form.value.name,
    location: form.value.location,
    capacity: form.value.capacity,
    status: form.value.status,
    brief: form.value.brief,
    mainImage: form.value.mainImage,
    images: parseImages(form.value.imagesInput),
    params: parseParams(form.value.paramsInput),
    detail: form.value.detail
  }

  try {
    if (form.value.id) {
      await request.put(`/classrooms/${form.value.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/classrooms', payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchClassrooms()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const confirmDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除教室【${row.name}】吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/classrooms/${row.id}`)
    ElMessage.success('删除成功')
    fetchClassrooms()
  } catch (error) {
    // 取消或失败均不处理
  }
}

onMounted(() => {
  fetchClassrooms()
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
  width: 220px;
}

.table {
  width: 100%;
}

.helper-text {
  margin-top: 16px;
  color: #999;
  font-size: 12px;
}
</style>
