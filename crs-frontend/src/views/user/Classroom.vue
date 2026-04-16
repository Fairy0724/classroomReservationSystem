<template>
  <div class="classroom-list-page">
    <!-- 顶部导航（复用组件） -->
    <NavBar :keyword="keyword" :show-search="true" :show-classroom-link="false" @update:keyword="keyword = $event"
      @search="handleSearch" />

    <!-- ==================== 筛选区域 ==================== -->
    <div class="filter-panel">
      <div class="filter-item">
        <label>教室类型</label>
        <select v-model="filters.type">
          <option value="">全部</option>
          <option v-for="item in typeOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>

      <div class="filter-item">
        <label>楼层</label>
        <select v-model="filters.floor">
          <option value="">全部</option>
          <option v-for="item in floorOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>

      <div class="filter-item">
        <label>教学楼</label>
        <select v-model="filters.building">
          <option value="">全部</option>
          <option v-for="item in buildingOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>

      <div class="filter-item">
        <label>院系</label>
        <select v-model="filters.department">
          <option value="">全部</option>
          <option v-for="item in departmentOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>

      <div class="filter-item">
        <label>状态</label>
        <select v-model="filters.status">
          <option value="">全部</option>
          <option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </div>

      <button class="reset-btn" @click="resetFilters">清空筛选</button>
    </div>

    <!-- ==================== 教室卡片列表 ==================== -->
    <div class="list">
      <div v-for="room in filteredClassrooms" :key="room.classroomId" class="card"
        @click="goToDetail(room.classroomId)">
        <img :src="room.mainImage || logoUrl" :alt="formatRoomName(room)" />
        <div class="info">
          <h3>{{ formatRoomName(room) }}</h3>
          <p>{{ room.type }} · {{ room.equipment || '设备待完善' }}</p>
          <div class="meta">
            <span>地点：{{ room.building }}-{{ room.floor }}层</span>
            <span>容量：{{ room.capacity }}人</span>
          </div>
          <div class="meta">
            <span>学院：{{ room.deptName }}</span>
            <span>状态：{{ room.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
/**
 * 教室列表页
 * - 顶部导航与首页保持一致
 * - 支持多条件筛选（类型/设备/教学楼）
 * - 条件可选：未选中时默认展示全部教室
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../../utils/request'
import logoUrl from '@/assets/images/logo.png'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()

// ==================== 搜索与筛选条件 ====================
const keyword = ref('')
const filters = ref({
  type: '',
  building: '',
  floor: '',
  department: '',
  status: ''
})

// ==================== 教室数据与筛选项 ====================
const classrooms = ref([])
const typeOptions = ref([])
const buildingOptions = ref([])
const floorOptions = ref([])
const departmentOptions = ref([])
const statusOptions = ref([])

// 教室名称：楼号 + 教室编号
const formatRoomName = (room) => {
  const building = room.building || ''
  const roomNum = room.roomNum || ''
  return `${building}${roomNum}` || '教室'
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

// 构建筛选项（类型/教学楼/楼层/院系/状态）
const buildFilterOptions = (rooms) => {
  const typeSet = new Set()
  const buildingSet = new Set()
  const floorSet = new Set()
  const departmentSet = new Set()
  const statusSet = new Set()

  rooms.forEach(room => {
    if (room.type) typeSet.add(room.type)
    if (room.building) buildingSet.add(room.building)
    if (room.floor !== undefined && room.floor !== null && room.floor !== '') floorSet.add(room.floor)
    if (room.deptName) departmentSet.add(room.deptName)
    if (room.status) statusSet.add(room.status)
  })

  typeOptions.value = Array.from(typeSet)
  buildingOptions.value = Array.from(buildingSet)
  floorOptions.value = Array.from(floorSet)
  departmentOptions.value = Array.from(departmentSet)
  statusOptions.value = Array.from(statusSet)
}

// ==================== 过滤后的教室列表 ====================
const filteredClassrooms = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return classrooms.value.filter(room => {
    // 关键字匹配：教室名称或位置
    const name = formatRoomName(room).toLowerCase()
    const location = `${room.building || ''}-${room.floor || ''}`.toLowerCase()
    const matchKeyword = !key || name.includes(key) || location.includes(key)

    // 类型筛选
    const matchType = !filters.value.type || room.type === filters.value.type

    // 教学楼筛选
    const matchBuilding = !filters.value.building || room.building === filters.value.building
    // 楼层筛选
    const matchFloor = !filters.value.floor || String(room.floor) === String(filters.value.floor)
    // 院系筛选
    const matchDepartment = !filters.value.department || room.deptName === filters.value.department
    // 状态筛选
    const matchStatus = !filters.value.status || room.status === filters.value.status

    return matchKeyword && matchType && matchBuilding && matchFloor && matchDepartment && matchStatus
  })
})

// ==================== 数据获取 ====================
const fetchClassrooms = async () => {
  try {
    const res = await request.get('/classrooms')
    const roomList = Array.isArray(res) ? res : []
    classrooms.value = sortClassrooms(roomList)
    buildFilterOptions(classrooms.value)
  } catch (error) {
    ElMessage.error('获取教室列表失败')
  }
}

// ==================== 事件处理 ====================
const handleSearch = () => {
  // 搜索由 computed 自动生效，保留方法用于回车和按钮触发
}
// 重置筛选条件
const resetFilters = () => {
  filters.value = { type: '', building: '', floor: '', department: '', status: '' }
  keyword.value = ''
}

const goToDetail = (id) => {
  router.push(`/classroom/${id}`)
}

onMounted(() => {
  fetchClassrooms()
  if (route.query.keyword) {
    keyword.value = String(route.query.keyword)
  }
})

watch(() => route.query.keyword, (value) => {
  if (value !== undefined) {
    keyword.value = String(value || '')
  }
})
</script>



<style scoped>
.classroom-list-page {
  min-height: 100vh;
  background: #f0f4f8;
}

.filter-panel {
  max-width: 1400px;
  margin: 16px auto 20px;
  padding: 18px 20px;
  background: #ffffff;
  border-radius: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.filter-item label {
  font-size: 12px;
  color: #8a94a6;
}

.filter-item select {
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 10px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.filter-item select[multiple] {
  height: 96px;
  padding: 8px 10px;
}

.filter-item select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
}

.reset-btn {
  height: 36px;
  /* 内边距 */
  padding: 0 16px;
  margin: 20px 0 0 20px;
  border: none;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: #fff;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.reset-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(64, 158, 255, 0.25);
}

.list {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px 40px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.15);
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.info {
  padding: 18px;
}

.info h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #1f2937;
}

.info p {
  color: #6b7280;
  margin: 0 0 12px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 992px) {
  .list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .list {
    grid-template-columns: 1fr;
  }
}
</style>
