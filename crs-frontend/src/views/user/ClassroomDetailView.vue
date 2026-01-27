<template>
  <div class="product-detail-page">
    <!-- ============================================================
         顶部导航栏（保持原样式结构，替换为教室系统文案）
         说明：不改样式，改内容，确保整体视觉风格一致
    ============================================================= -->
    <nav class="nav-container">
      <div class="nav-wrapper">
        <div class="logo">
          <img src="../assets/images/logo.png" alt="教室预约系统 Logo">
        </div>
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="搜索教室..." @keyup.enter="handleSearch">
          <button class="search-btn" @click="handleSearch">
            <i class="fa fa-search"></i>
          </button>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/classrooms" class="nav-link">教室列表</RouterLink>
          <RouterLink to="/my-reservations" class="nav-link">我的预约</RouterLink>
          <RouterLink to="/notice" class="nav-link">系统公告</RouterLink>
          <template v-if="userStore.token">
            <RouterLink v-if="isTeacher" to="/approval" class="nav-link">审批管理</RouterLink>
            <a href="#" class="nav-link" @click.prevent="logout">退出登录</a>
          </template>
          <template v-else>
            <RouterLink to="/login" class="nav-link">登录</RouterLink>
          </template>
        </div>
      </div>
    </nav>

    <div class="container">
      <div class="product-detail">
        <!-- ============================================================
             教室图片展示区（沿用商品图片布局）
             说明：主图 + 缩略图，便于展示教室多角度照片
        ============================================================= -->
        <div class="product-gallery">
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
        <div class="product-info">
          <h1 class="product-name">{{ roomName }}</h1>
          <div class="product-brief">{{ classroom.type }} · {{ classroom.equipment || '设备待完善' }}</div>

          <!-- 教室基础信息（使用原 price-section 排版） -->
          <div class="price-section">
            <div class="current-price">可容纳 {{ classroom.capacity }} 人</div>
            <div class="original-price">{{ locationText }}</div>
            <div class="discount-tag" :class="classroom.status">
              {{ statusText }}
            </div>
          </div>

          <!-- 操作按钮（仅展示入口，表单在预约页） -->
          <div class="actions">
            <button class="btn-buy-now" @click="goToReserve">一键预约</button>
            <button class="btn-favorite" @click="toggleFavorite">
              <i :class="isFavorite ? 'icon-heart-filled' : 'icon-heart'"></i>
              收藏教室
            </button>
          </div>

          <!-- 使用须知（替换服务承诺） -->
          <div class="service-promises">
            <div class="promise-item">
              <i class="icon-genuine"></i>
              <span>提前预约</span>
            </div>
            <div class="promise-item">
              <i class="icon-shipping"></i>
              <span>准时使用</span>
            </div>
            <div class="promise-item">
              <i class="icon-return"></i>
              <span>保持整洁</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================
           教室详情 tabs（保留结构，替换内容）
      ============================================================= -->
      <div class="product-tabs">
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

// 是否为教师角色
const isTeacher = computed(() => userStore.userInfo?.role === 'teacher')

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

// 教室名称：楼号 + 教室编号
const roomName = computed(() => {
  const building = classroom.value.building || ''
  const roomNum = classroom.value.roomNum || ''
  return `${building}${roomNum}` || '教室'
})

// 位置信息
const locationText = computed(() => {
  return `${classroom.value.building}-${classroom.value.floor}层`
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

// 退出登录
const logout = () => {
  userStore.logout()
  router.push('/login')
}

// 初始化
onMounted(() => {
  fetchClassroom()
  checkFavorite()
})
</script>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.product-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.product-gallery {
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

.product-info {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-name {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.product-brief {
  color: #666;
  margin-bottom: 20px;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 30px;
}

.current-price {
  font-size: 28px;
  color: #2ecc71;
  font-weight: bold;
}

.original-price {
  color: #999;
  text-decoration: line-through;
}

.discount-tag {
  background: #2ecc71;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.specs,
.quantity {
  margin-bottom: 30px;
}

.spec-title {
  font-size: 16px;
  color: #666;
  margin-bottom: 12px;
}

.spec-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.spec-options button {
  padding: 8px 20px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.spec-options button.active {
  border-color: #2ecc71;
  color: #2ecc71;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quantity-selector button {
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.quantity-selector input {
  width: 60px;
  height: 36px;
  text-align: center;
  border: 1px solid #ddd;
}

.stock {
  color: #666;
  margin-left: 12px;
}

.actions {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.btn-add-cart,
.btn-buy-now,
.btn-favorite {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-add-cart {
  background: #fff;
  border: 1px solid #2ecc71;
  color: #2ecc71;
}

.btn-buy-now {
  background: #2ecc71;
  color: #fff;
  flex: 2;
}

.btn-favorite {
  background: #f8f9fa;
  color: #666;
}

.service-promises {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid #eee;
}

.promise-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.product-tabs {
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

.reviews-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-item {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.rating {
  color: #ffd700;
}

.review-images {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}

.review-images img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.review-time {
  color: #999;
  font-size: 14px;
}

/* ==================== 教室详情新增样式 ==================== */
.date-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

/* 教室状态标签颜色 */
.discount-tag.available {
  background: #2ecc71;
}

.discount-tag.occupied {
  background: #f39c12;
}

.discount-tag.maintenance {
  background: #909399;
}
</style>