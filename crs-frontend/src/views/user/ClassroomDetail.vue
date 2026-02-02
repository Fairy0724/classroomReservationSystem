<template>
  <div class="classroom-detail-page">
    <!-- ============================================================
         顶部导航栏（保持原样式结构，替换为教室系统文案）
         说明：不改样式，改内容，确保整体视觉风格一致
    ============================================================= -->
    <NavBar :keyword="searchQuery" :show-search="true" :show-classroom-link="true"
      @update:keyword="searchQuery = $event" @search="handleSearch" />

    <div class="container">
      <div class="classroom-detail">
        <!-- ============================================================
             教室图片展示区（沿用商品图片布局）
             说明：主图 + 缩略图，便于展示教室多角度照片
        ============================================================= -->
        <div class="classroom-gallery">
          <div class="main-image">
            <img :src="classroom.mainImage" :alt="roomName" />
          </div>
          <div class="thumbnail-list">
            <img v-for="(img, index) in classroom.images" :key="index" :src="img" :alt="roomName"
              @click="changeMainImage(img)" :class="{ active: img === classroom.mainImage }" />
          </div>
        </div>

        <!-- ============================================================
             教室信息区（替换商品信息为教室字段）
             说明：保留原样式模块，字段改为教室信息
        ============================================================= -->
        <div class="classroom-info">
          <h1 class="classroom-name">{{ roomName }}</h1>
          <!-- 教室类型和设备信息 -->
          <div class="classroom-brief">
            <div class="type">
              教室类型：<span>{{ classroom.type }}</span>
            </div>
            <div class="equipment">
              教室设备：<span>{{ classroom.equipment || '设备待完善' }}</span>
            </div>
          </div>

          <!-- 教室基础信息（使用原 price-section 排版） -->
          <div class="classroom-meta">
            <div class="status-tag" :class="statusClass">
              教室状态：<span>{{ statusText }}</span>
            </div>
            <div class="capacity">
              容纳人数：<span>{{ classroom.capacity }}</span> 人
            </div>
            <div class="location">
              教室位置：<span>{{ locationText }}</span>
            </div>
            <!-- 所属学院 -->
            <div class="department">
              所属学院：<span>{{ classroom.deptName }}</span>
            </div>
            
          </div>

          <!-- 操作按钮（仅展示入口，表单在预约页） -->
          <div class="action-bar">
            <button class="btn-reserve" @click="goToReserve">去预约</button>
            <button class="btn-favorite" @click="toggleFavorite">
              <i :class="isFavorite ? 'icon-heart-filled' : 'icon-heart'"></i>
              收藏教室
            </button>
          </div>

          <!-- 使用须知（替换服务承诺） -->
          <div class="use-guidelines">
            <div class="guideline-item">
              <i class="icon-genuine"></i>
              <span>提前2小时预约</span>
            </div>
            <div class="guideline-item">
              <i class="icon-shipping"></i>
              <span>准时使用不违约</span>
            </div>
            <div class="guideline-item">
              <i class="icon-return"></i>
              <span>使用后保持整洁</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================
           教室详情 tabs（保留结构，替换内容）
      ============================================================= -->
      <div class="classroom-tabs">
        <div class="tab-headers">
          <div v-for="tab in tabs" :key="tab.key" :class="['tab-header', { active: currentTab === tab.key }]"
            @click="currentTab = tab.key">
            {{ tab.label }}
          </div>
        </div>

        <div class="tab-content">
          <!-- 教室介绍 -->
          <div v-if="currentTab === 'detail'" class="detail-content">
            <p>所属学院：{{ classroom.deptName }}</p>
            <p>楼号：{{ classroom.building }}</p>
            <p>楼层：{{ classroom.floor }}</p>
            <p>教室编号：{{ classroom.roomNum }}</p>
            <p>教室类型：{{ classroom.type }}</p>
            <p>设备：{{ classroom.equipment || '设备待完善' }}</p>
          </div>
          <!-- 设备参数 -->
          <div v-if="currentTab === 'params'" class="params-content">
            <table>
              <tbody>
                <tr>
                  <td class="param-key">容量</td>
                  <td class="param-value">{{ classroom.capacity }} 人</td>
                </tr>
                <tr>
                  <td class="param-key">状态</td>
                  <td class="param-value">{{ statusText }}</td>
                </tr>
                <tr>
                  <td class="param-key">设备</td>
                  <td class="param-value">{{ classroom.equipment || '设备待完善' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================================
 * 教室详情页逻辑说明（保留原商品详情页结构，替换为教室业务）
 * ============================================================
 * 目标：
 * 1. 保持原页面结构和样式
 * 2. 将“商品”语义替换为“教室预约”语义
 * 3. 添加关键注释，便于理解逻辑
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import { useUserStore } from '../../stores/userStore'
import request from '../../utils/request'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ==================== 基础数据 ====================
const classroom = ref({
  classroomId: null,
  building: '',
  floor: 1,
  roomNum: '',
  deptName: '',
  capacity: 0,
  equipment: '',
  type: '',
  status: '',
  mainImage: '',
  extraImages: [],
  images: []
})

const searchQuery = ref('')
const currentTab = ref('detail')
const isFavorite = ref(false)

// Tabs 配置（保留结构，内容改为数据库字段展示）
const tabs = [
  { key: 'detail', label: '教室介绍' },
  { key: 'params', label: '设备参数' }
]


// 教室状态文本
const statusText = computed(() => {
  const map = {
    available: '可预约',
    occupied: '使用中',
    maintenance: '维护中',
    '可用': '可预约',
    '维护中': '维护中'
  }
  return map[classroom.value.status] || classroom.value.status || '可预约'
})

// 新增：匹配CSS样式的英文类名（核心！解决样式不匹配）
const statusClass = computed(() => {
  const map = {
    // 后端可能返回的中文/英文状态 → 统一映射为CSS的英文类名
    '可用': 'available',
    '可预约': 'available',
    'available': 'available',
    '使用中': 'occupied',
    'occupied': 'occupied',
    '维护中': 'maintenance',
    'maintenance': 'maintenance'
  }
  return map[classroom.value.status] || 'available' // 无值默认显示可预约样式
})

// 教室名称：楼号 + 教室编号
const roomName = computed(() => {
  const building = classroom.value.building || ''
  const roomNum = classroom.value.roomNum || ''
  return `${building}${roomNum}` || '教室'
})

// 位置信息
const locationText = computed(() => {
  return `${classroom.value.building}-${classroom.value.floor}层-${classroom.value.roomNum}`
})

// ==================== 页面交互方法 ====================

/** 搜索教室 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/classrooms',
      query: { keyword: searchQuery.value }
    })
  }
}

/** 修改主图 */
const changeMainImage = (img) => {
  if (!img) return
  classroom.value.mainImage = img
}

// ==================== 收藏功能（本地模拟） ====================
const FAVORITE_KEY = 'favorite_classrooms'

/** 读取收藏状态（本地存储模拟） */
const checkFavorite = () => {
  const list = JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]')
  isFavorite.value = list.includes(String(route.params.id))
}

/** 切换收藏状态 */
const toggleFavorite = () => {
  if (!userStore.token) {
    router.push('/login')
    return
  }
  const list = JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]')
  const id = String(route.params.id)
  if (list.includes(id)) {
    const nextList = list.filter(item => item !== id)
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(nextList))
    isFavorite.value = false
    ElMessage.success('已取消收藏')
  } else {
    list.push(id)
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(list))
    isFavorite.value = true
    ElMessage.success('收藏成功')
  }
}

// ==================== 预约入口 ====================

/** 跳转到预约页面（预约表单单独页面） */
const goToReserve = () => {
  if (!userStore.token) {
    router.push('/login')
    return
  }
  router.push(`/classroom/${classroom.value.classroomId}/reserve`)
}

// ==================== 获取教室详情 ====================

/**
 * 说明：
 * 1. 请求后端接口
 * 2. 若教室不存在则跳回列表
 */
const fetchClassroom = async () => {
  let res = null
  try {
    res = await request.get('/classrooms', {
      params: { id: route.params.id }
    })
  } catch (error) {
    ElMessage.error('教室信息加载失败')
    router.push('/classrooms')
    return
  }

  if (Array.isArray(res) && res.length > 0) {
    classroom.value = res[0]
  } else {
    throw new Error('教室不存在')
  }

  // 统一图片列表
  classroom.value.images = [
    classroom.value.mainImage,
    ...(Array.isArray(classroom.value.extraImages) ? classroom.value.extraImages : [])
  ].filter(Boolean)
}

// 初始化
onMounted(() => {
  fetchClassroom()
  checkFavorite()
})
</script>

<style scoped>
.classroom-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.classroom-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.classroom-gallery {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-image {
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
  overflow: hidden;
  border-radius: 8px;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-list {
  display: flex;
  gap: 10px;
}

.thumbnail-list img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
}

.thumbnail-list img.active {
  border-color: #2ecc71;
}

.classroom-info {
  background: #fff;
  /* 内边距 */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.classroom-name {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 教室类型和设备信息 */
.classroom-brief {
  color: #666;
  /* margin-bottom: 20px; */
}

.classroom-meta {
  /* display: flex;  */
  gap: 16px;
  margin-bottom: 30px;
  color: #666;
}

/* .capacity {
  font-size: 28px;
  color: #2ecc71;
  font-weight: bold;
} */

.location {
  color: #666;
}

/* 教室状态标签 */
.status-tag span {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}

/* .status-tag.available span {
  background: #e6ffed;
  color: #2ecc71;
} */
/* 教室状态标签颜色 */
.status-tag.available span {
  background: #e6ffed;
  color: #2ecc71;
}

.status-tag.occupied span {
  background: #fff4e5;
  color: #f39c12;
}

.status-tag.maintenance span {
  background: #fee2e2;
  color: #dc2626;
}

.action-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.btn-reserve,
.btn-favorite {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-reserve {
  background: #2ecc71;
  color: #fff;
  flex: 2;
}

.btn-favorite {
  background: #f8f9fa;
  color: #666;
}

.use-guidelines {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid #eee;
}

.guideline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.classroom-tabs {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 40px;
}

.tab-headers {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab-header {
  padding: 20px 40px;
  cursor: pointer;
  color: #666;
}

.tab-header.active {
  color: #2ecc71;
  border-bottom: 2px solid #2ecc71;
}

.tab-content {
  padding: 40px;
}

.params-content table {
  width: 100%;
  border-collapse: collapse;
}

.params-content td {
  padding: 12px;
  border: 1px solid #eee;
}

.param-key {
  background: #f8f9fa;
  width: 200px;
}

/* ==================== 教室详情新增样式 ==================== */
.date-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}
</style>