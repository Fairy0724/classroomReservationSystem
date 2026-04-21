<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="panel">
        <div class="panel-header">
          <h2>教室维护</h2>
          <div class="actions">
            <el-input v-model="keyword" placeholder="按名称/位置搜索" clearable class="search-input"
              @keyup.enter="fetchClassrooms" />
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-button @click="triggerImport">导入</el-button>
            <el-button @click="exportCsv">导出</el-button>
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
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="720px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="楼号" required>
          <el-input v-model="form.building" placeholder="例如：3教 / 三教 / 3号楼" />
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

    <input ref="fileInput" type="file" accept=".csv" class="hidden-file" @change="handleImportFile" />
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
const fileInput = ref(null)

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

const parseChineseNumber = (text) => {
  const token = String(text || '').trim()
  if (!token) return null

  const digitMap = {
    '零': 0,
    '一': 1,
    '二': 2,
    '两': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9
  }
  const unitMap = {
    '十': 10,
    '百': 100,
    '千': 1000
  }

  let result = 0
  let current = 0

  for (const ch of token) {
    if (Object.prototype.hasOwnProperty.call(digitMap, ch)) {
      current = digitMap[ch]
      continue
    }
    if (Object.prototype.hasOwnProperty.call(unitMap, ch)) {
      const unit = unitMap[ch]
      if (current === 0) current = 1
      result += current * unit
      current = 0
    }
  }

  const total = result + current
  return Number.isFinite(total) && total > 0 ? total : null
}

const getBuildingPriority = (building) => {
  const text = String(building || '').trim()
  if (!text) return Number.MAX_SAFE_INTEGER

  const arabicMatch = text.match(/(\d+)\s*(号楼|教)/)
  if (arabicMatch) return Number(arabicMatch[1])

  const chineseMatch = text.match(/([零一二两三四五六七八九十百千]+)\s*(号楼|教)/)
  if (chineseMatch) {
    const n = parseChineseNumber(chineseMatch[1])
    if (n !== null) return n
  }

  return Number.MAX_SAFE_INTEGER
}

const getRoomSortNumber = (roomNum) => {
  const match = String(roomNum || '').match(/\d+/)
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER
}

const sortClassrooms = (rooms) => {
  return [...rooms].sort((a, b) => {
    const buildingDiff = getBuildingPriority(a.building) - getBuildingPriority(b.building)
    if (buildingDiff !== 0) return buildingDiff

    const buildingNameDiff = String(a.building || '').localeCompare(String(b.building || ''), 'zh-Hans-CN')
    if (buildingNameDiff !== 0) return buildingNameDiff

    const floorDiff = Number(a.floor || 0) - Number(b.floor || 0)
    if (floorDiff !== 0) return floorDiff

    return getRoomSortNumber(a.roomNum) - getRoomSortNumber(b.roomNum)
  })
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
    const roomList = Array.isArray(res) ? res : []
    classrooms.value = sortClassrooms(roomList)
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
    const displayName = `${row.building || ''}${row.roomNum || ''}` || `ID:${row.classroomId}`
    await ElMessageBox.confirm(`确认删除教室【${displayName}】吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/classrooms/${row.classroomId}`)
    ElMessage.success('删除成功')
    fetchClassrooms()
  } catch (error) {
    // 取消或失败均不处理
  }
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
  const headers = ['building', 'floor', 'roomNum', 'deptName', 'capacity', 'equipment', 'typeId', 'status', 'mainImage', 'extraImages']
  const rows = classrooms.value.map(item => [
    item.building,
    item.floor,
    item.roomNum,
    item.deptName,
    item.capacity,
    item.equipment,
    item.typeId,
    item.status,
    item.mainImage,
    Array.isArray(item.extraImages) ? item.extraImages.join('|') : ''
  ])
  downloadCsv('教室列表', headers, rows)
}

const downloadTemplate = () => {
  const headers = ['building', 'floor', 'roomNum', 'deptName', 'capacity', 'equipment', 'typeId', 'status', 'mainImage', 'extraImages']
  downloadCsv('教室导入模板', headers, [])
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
    楼号: 'building',
    楼层: 'floor',
    教室编号: 'roomNum',
    所属学院: 'deptName',
    容量: 'capacity',
    设备: 'equipment',
    教室类型ID: 'typeId',
    教室类型: 'typeId',
    状态: 'status',
    主图URL: 'mainImage',
    额外图片: 'extraImages'
  }
  return map[trimmed] || trimmed
}

const resolveTypeId = (rawValue) => {
  const text = String(rawValue || '').trim()
  if (!text) return null
  const asNumber = Number(text)
  if (Number.isInteger(asNumber) && asNumber > 0) return asNumber

  const found = classroomTypeOptions.value.find(item => item.typeName === text)
  return found?.id || null
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
      const typeId = resolveTypeId(row.typeId)
      if (!typeId) {
        errors.push(`第${i + 2}行：教室类型无效`)
        continue
      }

      const payload = {
        building: String(row.building || '').trim(),
        floor: Number(row.floor || 1),
        roomNum: String(row.roomNum || '').trim(),
        deptName: String(row.deptName || '').trim(),
        capacity: Number(row.capacity || 0),
        equipment: String(row.equipment || '').trim(),
        type: typeId,
        status: String(row.status || '可用').trim() || '可用',
        mainImage: String(row.mainImage || '').trim(),
        extraImages: String(row.extraImages || '').split('|').map(item => item.trim()).filter(Boolean)
      }

      if (!payload.building || !payload.roomNum || !payload.deptName || !payload.capacity) {
        errors.push(`第${i + 2}行：必填字段不完整`)
        continue
      }

      try {
        await request.post('/classrooms', payload)
        successCount += 1
      } catch (error) {
        const msg = error?.response?.data?.msg || '导入失败'
        errors.push(`第${i + 2}行：${msg}`)
      }
    }

    if (successCount) {
      ElMessage.success(`导入成功：${successCount} 条`)
      fetchClassrooms()
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
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.table {
  width: 100%;
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

.hidden-file {
  display: none;
}
</style>
