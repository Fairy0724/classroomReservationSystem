<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>教室维护</h2>
          <div class="actions">
            <el-input v-model="keyword" placeholder="按名称/位置搜索" clearable class="search-input"
              @keyup.enter="fetchClassrooms" />
            <el-button type="primary" @click="openCreateDialog">新增教室</el-button>
          </div>
        </div>
        <!-- 教室列表 -->
        <el-table :data="classrooms" stripe border v-loading="loading" class="table">
          <el-table-column prop="classroomId" label="序号" width="80" />
          <el-table-column prop="building" label="楼号" width="100" />
          <el-table-column prop="floor" label="楼层" width="80" />
          <el-table-column prop="roomNum" label="教室编号" width="120" />
          <el-table-column prop="deptName" label="所属学院" min-width="140" />
          <el-table-column prop="capacity" label="容量" width="100" />
          <el-table-column prop="equipment" label="设备" min-width="160" />
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="statusTag(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="mainImage" label="主图" min-width="140">
            <template #default="scope">
              <img :src="scope.row.mainImage" alt="主图" class="thumb" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button class="action-btn edit-btn" link @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button class="action-btn delete-btn" link @click="confirmDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <p class="helper-text">
          数据来自数据库 classroom 表。
        </p>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="720px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="楼号" required>
          <el-input v-model="form.building" placeholder="例如：一教" />
        </el-form-item>
        <el-form-item label="楼层" required>
          <el-input-number v-model="form.floor" :min="1" />
        </el-form-item>
        <el-form-item label="教室编号" required>
          <el-input v-model="form.roomNum" placeholder="例如：101" />
        </el-form-item>
        <el-form-item label="所属学院" required>
          <el-input v-model="form.deptName" placeholder="例如：计算机学院" />
        </el-form-item>
        <el-form-item label="容量" required>
          <el-input-number v-model="form.capacity" :min="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="选择状态">
            <el-option label="可用" value="可用" />
            <el-option label="维护中" value="维护中" />
          </el-select>
        </el-form-item>
        <el-form-item label="教室类型" required>
          <el-select v-model="form.type" placeholder="请选择教室类型" style="width: 100%">
            <el-option v-for="item in classroomTypeOptions" :key="item.id" :label="item.typeName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备">
          <el-input v-model="form.equipment" placeholder="例如：投影仪,空调,白板" />
        </el-form-item>
        <el-form-item label="主图URL">
          <el-input v-model="form.mainImage" placeholder="http://..." />
        </el-form-item>
        <el-form-item label="额外图片">
          <el-input v-model="form.extraImagesInput" type="textarea" rows="2" placeholder="多张图片用英文逗号分隔" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 教室管理页面（管理员）
 * - 读取教室列表
 * - 新增 / 编辑 / 删除
 */
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
const classrooms = ref([])
const classroomTypeOptions = ref([])
const loading = ref(false)
const keyword = ref('')

const dialogVisible = ref(false)
const form = ref({
  classroomId: null,
  building: '',
  floor: 1,
  roomNum: '',
  deptName: '',
  capacity: 1,
  equipment: '',
  type: null,
  status: '可用',
  mainImage: '',
  extraImagesInput: ''
})

const dialogTitle = computed(() => (form.value.classroomId ? '编辑教室' : '新增教室'))

const statusText = (status) => {
  const map = {
    '可用': '可用',
    '维护中': '维护中',
    available: '可用',
    maintenance: '维护中'
  }
  return map[status] || status || '未知'
}

const statusTag = (status) => {
  if (status === '可用' || status === 'available') return 'success'
  if (status === '维护中' || status === 'maintenance') return 'danger'
  return 'info'
}

// 解析图片地址（逗号分隔）
const parseImages = (input) => {
  return String(input || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

// 初始化表单
const resetForm = () => {
  form.value = {
    classroomId: null,
    building: '',
    floor: 1,
    roomNum: '',
    deptName: '',
    capacity: 1,
    equipment: '',
    type: null,
    status: '可用',
    mainImage: '',
    extraImagesInput: ''
  }
}

const fetchClassroomTypes = async () => {
  try {
    const res = await request.get('/classroom-types', {
      params: {
        page: 1,
        pageSize: 1000
      }
    })
    classroomTypeOptions.value = Array.isArray(res?.data) ? res.data : []
  } catch (error) {
    classroomTypeOptions.value = []
    ElMessage.error('获取教室类型失败')
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
    classroomId: row.classroomId,
    building: row.building,
    floor: row.floor,
    roomNum: row.roomNum,
    deptName: row.deptName,
    capacity: row.capacity,
    equipment: row.equipment || '',
    type: row.typeId ? Number(row.typeId) : null,
    status: row.status || '可用',
    mainImage: row.mainImage || '',
    extraImagesInput: Array.isArray(row.extraImages) ? row.extraImages.join(',') : ''
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.building || !form.value.roomNum || !form.value.deptName || !form.value.capacity || !form.value.type) {
    ElMessage.warning('请填写必填项')
    return
  }

  const payload = {
    building: form.value.building,
    floor: form.value.floor,
    roomNum: form.value.roomNum,
    deptName: form.value.deptName,
    capacity: form.value.capacity,
    equipment: form.value.equipment,
    type: form.value.type,
    status: form.value.status,
    mainImage: form.value.mainImage,
    extraImages: parseImages(form.value.extraImagesInput)
  }

  try {
    if (form.value.classroomId) {
      await request.put(`/classrooms/${form.value.classroomId}`, payload)
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
    await request.delete(`/classrooms/${row.classroomId}`)
    ElMessage.success('删除成功')
    fetchClassrooms()
  } catch (error) {
    // 取消或失败均不处理
  }
}

onMounted(() => {
  fetchClassroomTypes()
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

.thumb {
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #eee;
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
