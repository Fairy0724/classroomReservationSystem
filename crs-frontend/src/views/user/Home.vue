<template>
  <!-- 
    ============================================================
    教室预约系统 - 首页 (学生/教师通用)
    ============================================================
    功能说明：
    1. 顶部导航：Logo、搜索框、用户菜单
    2. 轮播图：展示校园/教室宣传图
    3. 快捷功能区：根据角色显示不同功能入口
    4. 教室列表：按类型分类展示可预约教室
    5. 【教师专属】我的课程/审批管理等模块
    6. 页脚：系统信息和联系方式
  -->
  <div class="home-container">

    <!-- ==================== 顶部导航栏 ==================== -->
    <NavBar v-model="searchQuery" :show-home-link="false" @update:keyword="searchQuery = $event"
      @search="handleSearch" />
    <!-- ==================== 轮播图区域 ==================== -->
    <div class="hero-section">
      <el-carousel height="400px" :interval="5000" indicator-position="outside">
        <el-carousel-item v-for="slide in slides" :key="slide.id">
          <div class="slide-wrapper">
            <img :src="slide.imageUrl" :alt="slide.title" class="slide-image">
            <div class="slide-content">
              <h1>{{ slide.title }}</h1>
              <p>{{ slide.description }}</p>
              <el-button type="primary" size="large" @click="handleSlideClick(slide)">
                {{ slide.buttonText || '了解更多' }}
              </el-button>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>

    <!-- ==================== 快捷功能区 ==================== -->
    <!-- 说明：根据用户角色显示不同的快捷入口 -->
    <div class="quick-actions-section">
      <div class="section-wrapper">
        <h2 class="section-title">快捷功能</h2>
        <div class="action-grid">
          <!-- 通用功能：学生和教师都能看到 -->
          <div class="action-card" @click="goToReservation">
            <div class="action-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon :size="32">
                <Calendar />
              </el-icon>
            </div>
            <h3>预约教室</h3>
            <p>查看空闲教室，快速预约</p>
          </div>

          <div class="action-card" @click="goToMyReservations">
            <div class="action-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon :size="32">
                <List />
              </el-icon>
            </div>
            <h3>我的预约</h3>
            <p>查看预约记录和状态</p>
          </div>

          <div class="action-card" @click="goToNotice">
            <div class="action-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <el-icon :size="32">
                <Bell />
              </el-icon>
            </div>
            <h3>系统公告</h3>
            <p>查看最新通知公告</p>
          </div>

          <!-- ========== 【教师专属功能】========== -->
          <!-- 只有教师角色才能看到以下功能 -->
          <div v-if="isTeacher" class="action-card teacher-card" @click="goToApproval">
            <div class="action-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
              <el-icon :size="32">
                <Checked />
              </el-icon>
            </div>
            <h3>审批管理</h3>
            <p>处理学生预约申请</p>
            <!-- 待审批角标 -->
            <span v-if="pendingCount > 0" class="action-badge">{{ pendingCount }}</span>
          </div>

          <!-- <div v-if="isTeacher" class="action-card teacher-card" @click="goToMyCourses">
            <div class="action-icon" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
              <el-icon :size="32">
                <Reading />
              </el-icon>
            </div>
            <h3>我的课程</h3>
            <p>管理我的授课安排</p>
          </div> -->
        </div>
      </div>
    </div>

    <!-- ==================== 教室列表区域 ==================== -->
    <div class="classroom-section">
      <div class="section-wrapper">
        <h2 class="section-title">可预约教室</h2>

        <!-- 教室类型筛选标签 -->
        <div class="category-tabs">
          <div class="tab-item" :class="{ active: !selectedCategory }" @click="selectCategory(null)">
            全部教室
          </div>
          <div v-for="category in categories" :key="category.id" class="tab-item"
            :class="{ active: selectedCategory === category.id }" @click="selectCategory(category.id)">
            {{ category.name }}
          </div>
        </div>

        <!-- 当前筛选提示 -->
        <div v-if="selectedCategory" class="current-category">
          当前分类：{{ getCategoryName(selectedCategory) }}
          <span class="clear-category" @click="clearCategory">×</span>
        </div>

        <!-- 教室卡片网格 -->
        <div class="classroom-grid">
          <!-- 无数据提示 -->
          <div v-if="currentPageClassrooms.length === 0" class="no-data">
            <el-empty description="该分类暂无可用教室" />
          </div>

          <!-- 教室卡片 -->
          <div v-else v-for="classroom in currentPageClassrooms" :key="classroom.id" class="classroom-card"
            @click="goToClassroomDetail(classroom.id)">
            <!-- 教室图片 -->
            <div class="classroom-image">
              <img :src="classroom.imageUrl" :alt="classroom.name">
              <!-- 状态标签 -->
              <div class="status-badge" :class="classroom.status">
                {{ getStatusText(classroom.status) }}
              </div>
              <!-- 快速预约按钮 -->
              <button class="quick-reserve-btn" @click.stop="quickReserve(classroom)">
                <el-icon>
                  <Calendar />
                </el-icon> 快速预约
              </button>
            </div>

            <!-- 教室信息 -->
            <div class="classroom-info">
              <!-- 教室类型标签 -->
              <div class="classroom-type">{{ classroom.typeName || '普通教室' }}</div>
              <!-- 教室名称 -->
              <h3>{{ classroom.name }}</h3>
              <!-- 教室详情 -->
              <div class="classroom-details">
                <span><el-icon>
                    <Location />
                  </el-icon> {{ classroom.location || '教学楼A' }}</span>
                <span><el-icon>
                    <User />
                  </el-icon> 容纳 {{ classroom.capacity || 50 }} 人</span>
              </div>
              <!-- 设备标签 -->
              <div class="equipment-tags">
                <el-tag v-for="equip in (classroom.equipment || ['投影仪', '空调']).slice(0, 3)" :key="equip" size="small"
                  type="info">
                  {{ equip }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页组件 -->
        <div class="pagination-wrapper">
          <AppPagination v-if="filteredClassrooms.length" :page="currentPage" :total="filteredClassrooms.length"
            :page-size="pageSize" @change="handlePageChange" />
        </div>
      </div>
    </div>

    <!-- ==================== 系统公告区域 ==================== -->
    <div class="notice-section">
      <div class="section-wrapper">
        <h2 class="section-title">系统公告</h2>
        <div class="notice-list">
          <div v-for="notice in notices.slice(0, 4)" :key="notice.id" class="notice-item"
            @click="goToNoticeDetail(notice.id)">
            <div class="notice-icon">
              <el-icon :size="20">
                <Bell />
              </el-icon>
            </div>
            <div class="notice-content">
              <h4>{{ notice.title }}</h4>
              <p>{{ notice.summary }}</p>
            </div>
            <div class="notice-time">{{ notice.createTime }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 页脚 ==================== -->
  </div>
</template>

<script setup>
/**
 * ============================================================
 * HomeView - 教室预约系统首页
 * ============================================================
 * 
 * 功能说明：
 * 1. 学生和教师共用首页，通过角色判断显示不同模块
 * 2. 学生功能：预约教室、查看我的预约、课程表、公告
 * 3. 教师功能：除学生功能外，还有审批管理、我的课程
 * 
 * 角色判断：
 * - isTeacher: 判断当前用户是否为教师角色
 * - 教师专属模块会用 v-if="isTeacher" 控制显示
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppPagination from '@/components/AppPagination.vue'
import { useUserStore } from '../../stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'
import {
  Bell, ArrowRight,
  Calendar, List, User, Checked, Reading
} from '@element-plus/icons-vue'

// ==================== 路由和状态管理 ====================
const router = useRouter()
const userStore = useUserStore()

// ==================== 响应式数据 ====================
const searchQuery = ref('')           // 搜索关键词
const currentPage = ref(1)            // 当前页码
const pageSize = 8                    // 每页显示数量
const selectedCategory = ref(null)   // 选中的分类ID

// 数据列表
const slides = ref([])               // 轮播图数据
const categories = ref([])           // 教室分类
const classrooms = ref([])           // 教室列表
const notices = ref([])              // 系统公告
const pendingReservations = ref([])  // 【教师】待审批预约
const pendingCount = ref(0)          // 【教师】待审批数量

// ==================== 计算属性 ====================

/**
 * 判断当前用户是否为教师
 * 教师角色会显示额外的功能模块：审批管理、我的课程等
 */
const isTeacher = computed(() => {
  return userStore.userInfo?.role === 'teacher'
})

/**
 * 根据分类筛选教室列表
 */
const filteredClassrooms = computed(() => {
  if (!selectedCategory.value) {
    return classrooms.value
  }
  return classrooms.value.filter(
    room => room.categoryId === selectedCategory.value
  )
})

/**
 * 当前页显示的教室列表（分页后）
 */
const currentPageClassrooms = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredClassrooms.value.slice(start, end)
})

// ==================== 方法：导航跳转 ====================

/** 跳转到预约页面 */
const goToReservation = () => router.push('/classrooms')

/** 跳转到我的预约 */
const goToMyReservations = () => router.push('/my-reservations')

/** 跳转到公告列表 */
const goToNotice = () => router.push('/notice')

/** 【教师】跳转到审批管理 */
const goToApproval = () => router.push('/approval')

/** 【教师】跳转到我的课程 */
const goToMyCourses = () => router.push('/my-courses')

/** 跳转到教室详情 */
const goToClassroomDetail = (id) => {
  router.push({ path: `/classroom/${id}` })
}

/** 跳转到公告详情 */
const goToNoticeDetail = (id) => {
  router.push({ path: `/notice/${id}` })
}

/**
 * 搜索教室
 */
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/classrooms',
      query: { keyword: searchQuery.value }
    })
  }
}

/**
 * 轮播图点击处理
 */
const handleSlideClick = (slide) => {
  if (slide.link) {
    router.push(slide.link)
  }
}

// ==================== 方法：分类筛选 ====================

/**
 * 选择教室分类
 */
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
  currentPage.value = 1 // 重置页码
}

/**
 * 清除分类筛选
 */
const clearCategory = () => {
  selectedCategory.value = null
  currentPage.value = 1
}

/**
 * 获取分类名称
 */
const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : ''
}

/**
 * 获取教室状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    available: '可预约',
    occupied: '使用中',
    maintenance: '维护中',
    '可用': '可预约',
    '使用中': '使用中',
    '维护中': '维护中'
  }
  return statusMap[status] || '可预约'
}

const normalizeStatusKey = (status) => {
  if (status === '可用' || status === 'available') return 'available'
  if (status === '使用中' || status === 'occupied') return 'occupied'
  if (status === '维护中' || status === 'maintenance') return 'maintenance'
  return 'available'
}

const normalizeEquipment = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

// 默认排序：一教 -> 二教 -> 其他；同楼按楼层升序，再按教室号升序
const getBuildingPriority = (building) => {
  const text = String(building || '').trim()
  if (!text) return 99

  if (text.includes('一教') || text.includes('1号楼') || text.includes('1教')) return 1
  if (text.includes('二教') || text.includes('2号楼') || text.includes('2教')) return 2

  const match = text.match(/(\d+)/)
  if (match) return Number(match[1]) || 99
  return 99
}

const toFloorNumber = (floor) => {
  const n = Number(floor)
  return Number.isFinite(n) ? n : 999
}

const toRoomNumber = (roomNum) => {
  const match = String(roomNum || '').match(/(\d+)/)
  return match ? Number(match[1]) || 9999 : 9999
}

const buildCategories = (rooms) => {
  const typeMap = new Map()
  rooms.forEach(room => {
    const typeName = room.typeName || '其他'
    if (!typeMap.has(typeName)) {
      typeMap.set(typeName, typeMap.size + 1)
    }
  })

  categories.value = Array.from(typeMap.entries()).map(([name, id]) => ({ id, name }))
  rooms.forEach(room => {
    const typeName = room.typeName || '其他'
    room.categoryId = typeMap.get(typeName)
  })
}

/**
 * 分页变化处理
 */
const handlePageChange = (page) => {
  currentPage.value = page
  // 滚动到教室列表顶部
  document.querySelector('.classroom-section')?.scrollIntoView({ behavior: 'smooth' })
}

// ==================== 方法：快速预约 ====================

/**
 * 快速预约教室
 */
const quickReserve = (classroom) => {
  if (!userStore.token) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push({
    path: `/classroom/${classroom.id}/reserve`
  })
}


// ==================== 数据获取方法 ====================

/**
 * 获取轮播图数据
 */
const fetchSlides = async () => {
  // TODO: 从后端获取轮播图数据
  // const res = await request.get('/api/banners')
  // slides.value = res.data

  // 模拟数据
  slides.value = [
    {
      id: 1,
      imageUrl: 'https://picsum.photos/seed/banner1/1200/400',
      title: '智慧校园 · 教室预约系统',
      description: '便捷预约，高效管理，让教室资源利用更合理',
      buttonText: '立即预约',
      link: '/classrooms'
    },
    {
      id: 2,
      imageUrl: 'https://picsum.photos/seed/banner2/1200/400',
      title: '新学期 · 新功能上线',
      description: '支持批量预约、冲突检测、智能推荐',
      buttonText: '了解更多',
      link: '/notice'
    }
  ]
}

/**
 * 获取教室分类
 */
const fetchCategories = async () => {
  // TODO: 从后端获取分类数据
  // const res = await request.get('/api/classroom-types')
  // categories.value = res.data

  // 模拟数据
  categories.value = [
    { id: 1, name: '普通教室' },
    { id: 2, name: '多媒体教室' },
    { id: 3, name: '实验室' },
    { id: 4, name: '会议室' },
    { id: 5, name: '报告厅' },
    { id: 6, name: '自习室' }
  ]
}

/**
 * 获取教室列表
 */
const fetchClassrooms = async () => {
  try {
    const res = await request.get('/classrooms')
    const rooms = (res || []).map(item => {
      const building = item.building || ''
      const roomNum = item.roomNum || ''
      const floor = item.floor ?? ''
      const statusKey = normalizeStatusKey(item.status)

      return {
        id: item.classroomId,
        name: `${building}${roomNum}`,
        building,
        floor,
        roomNum,
        typeName: item.type || '普通教室',
        location: floor ? `${building}-${floor}层` : building,
        capacity: item.capacity,
        status: statusKey,
        equipment: normalizeEquipment(item.equipment),
        imageUrl: item.mainImage || ''
      }
    })

    rooms.sort((a, b) => {
      const buildingDiff = getBuildingPriority(a.building) - getBuildingPriority(b.building)
      if (buildingDiff !== 0) return buildingDiff

      const floorDiff = toFloorNumber(a.floor) - toFloorNumber(b.floor)
      if (floorDiff !== 0) return floorDiff

      return toRoomNumber(a.roomNum) - toRoomNumber(b.roomNum)
    })

    buildCategories(rooms)
    classrooms.value = rooms
  } catch (error) {
    ElMessage.error('获取教室数据失败')
  }
}

// ==================== 公告数据处理 ====================

// 时间格式化（YYYY-MM-DD）
const formatNoticeTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return String(time)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// 生成公告摘要（去空白 + 截断）
const buildNoticeSummary = (content) => {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '—'
  return text.length > 40 ? `${text.slice(0, 40)}...` : text
}

const normalizeNotice = (row) => {
  return {
    id: row.announcement_id ?? row.announcementId ?? row.id,
    title: row.title,
    summary: buildNoticeSummary(row.content),
    createTime: formatNoticeTime(row.publish_time ?? row.publishTime)
  }
}

/**
 * 获取系统公告
 */
const fetchNotices = async () => {
  try {
    const res = await request.get('/announcements', {
      params: { page: 1, pageSize: 4 }
    })
    const rows = Array.isArray(res?.data) ? res.data : []
    notices.value = rows.map(normalizeNotice)
  } catch (error) {
    notices.value = []
  }
}

/**
 * 【教师】获取待审批预约
 */
const fetchPendingReservations = async () => {
  if (!userStore.token) return
  try {
    const res = await request.get('/approvals/pending')
    const list = Array.isArray(res?.data) ? res.data : []
    pendingReservations.value = list
    pendingCount.value = list.length
  } catch (error) {
    pendingReservations.value = []
    pendingCount.value = 0
  }
}


// ==================== 生命周期 ====================

onMounted(async () => {
  // 并行加载数据，提高性能
  await Promise.all([
    fetchSlides(),
    fetchCategories(),
    fetchClassrooms(),
    fetchNotices()
  ])

  // 教师用户额外加载待审批数据
  if (isTeacher.value) {
    await fetchPendingReservations()
  }
})
</script>

<style scoped>
/**
 * ============================================================
 * 首页样式
 * ============================================================
 * 
 * 样式结构：
 * 1. 全局变量和基础样式
 * 2. 导航栏样式
 * 3. 轮播图样式
 * 4. 快捷功能区样式
 * 5. 教室列表样式
 * 6. 【教师专属】待审批区域样式
 * 7. 公告区域样式
 * 8. 页脚样式
 */

/* ==================== 全局变量 ==================== */
:root {
  --primary-color: #2ecc71;
  --primary-dark: #27ae60;
  --secondary-color: #f39c12;
  --text-color: #333;
  --text-light: #666;
  --bg-light: #f8f9fa;
  --bg-dark: #e9ecef;
  --border-radius: 8px;
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* ==================== 容器基础样式 ==================== */
.home-container {
  min-height: 100vh;
  background-color: var(--bg-light);
}

.section-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* 通用标题样式 */
.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

/* 标题角标 */
.title-badge {
  display: inline-block;
  background-color: var(--danger-color);
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
}

/* ==================== 角标样式 ==================== */
.action-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: var(--danger-color);
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
}

/* ==================== 轮播图样式 ==================== */
.hero-section {
  background-color: #fff;
}

.slide-wrapper {
  position: relative;
  height: 400px;
  overflow: hidden;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-content {
  position: absolute;
  top: 50%;
  left: 10%;
  transform: translateY(-50%);
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.slide-content h1 {
  font-size: 36px;
  margin-bottom: 16px;
}

.slide-content p {
  font-size: 18px;
  margin-bottom: 24px;
  opacity: 0.9;
}

/* ==================== 快捷功能区样式 ==================== */
.quick-actions-section {
  background-color: #fff;
  margin-top: 20px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.action-card {
  position: relative;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 24px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--primary-color);
}

/* 教师专属卡片样式 */
.action-card.teacher-card {
  border: 2px dashed var(--warning-color);
}

.action-card.teacher-card::before {
  content: '教师';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  background: var(--warning-color);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: #fff;
}

.action-card h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.action-card p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* ==================== 教室列表样式 ==================== */
.classroom-section {
  margin-top: 20px;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.tab-item {
  padding: 8px 20px;
  border-radius: 20px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-item:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab-item.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

/* 当前分类标签 */
.current-category {
  display: inline-flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 6px 16px;
  background-color: #ecf5ff;
  border-radius: 4px;
  color: var(--primary-color);
  font-size: 14px;
}

.clear-category {
  margin-left: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: color 0.3s;
}

.clear-category:hover {
  color: var(--danger-color);
}

/* 教室卡片网格 */
.classroom-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* 无数据提示 */
.no-data {
  grid-column: 1 / -1;
  padding: 60px 0;
}

/* 教室卡片 */
.classroom-card {
  background: #fff;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  cursor: pointer;
  transition: all 0.3s;
}

.classroom-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* 教室图片 */
.classroom-image {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.classroom-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.classroom-card:hover .classroom-image img {
  transform: scale(1.05);
}

/* 状态标签 */
.status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}

.status-badge.available {
  /* background-color: var(--success-color); */
  background-color: var(--primary-color);
}

.status-badge.occupied {
  background-color: var(--warning-color);
}

.status-badge.maintenance {
  background-color: var(--text-secondary);
}

/* 快速预约按钮 */
.quick-reserve-btn {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 20px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.classroom-card:hover .quick-reserve-btn {
  bottom: 10px;
}

.quick-reserve-btn:hover {
  background: var(--primary-color);
  color: #fff;
}

/* 教室信息 */
.classroom-info {
  padding: 16px;
}

.classroom-type {
  font-size: 12px;
  color: var(--primary-color);
  margin-bottom: 6px;
}

.classroom-info h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  font-weight: 600;
}

.classroom-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.classroom-details span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.equipment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* ==================== 【教师专属】待审批区域 ==================== */
.pending-section {
  background-color: #fffbf0;
  border-top: 3px solid var(--warning-color);
  margin-top: 20px;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 20px;
  border-radius: var(--border-radius);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.pending-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.student-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.pending-detail {
  font-size: 14px;
  color: var(--text-regular);
}

.pending-detail strong {
  color: var(--primary-color);
}

.time-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.pending-actions {
  display: flex;
  gap: 8px;
}

.view-all {
  text-align: center;
  margin-top: 20px;
}

/* ==================== 公告区域样式 ==================== */
.notice-section {
  background-color: #fff;
  margin-top: 20px;
}

.notice-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.3s;
}

.notice-item:hover {
  background: #ecf5ff;
}

.notice-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-content h4 {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*.notice-content p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}*/
.notice-content p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;

  /* 更完整的兼容性写法 */
  overflow: hidden;
  text-overflow: ellipsis;

  /* 多行文本截断 */
  display: -webkit-box;
  display: -moz-box;
  display: box;

  -webkit-line-clamp: 2;
  -moz-line-clamp: 2;
  line-clamp: 2;

  -webkit-box-orient: vertical;
  -moz-box-orient: vertical;
  box-orient: vertical;
}

.notice-time {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1200px) {
  .classroom-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .classroom-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .notice-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .classroom-grid {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pending-item {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .pending-actions {
    width: 100%;
  }

  .pending-actions .el-button {
    flex: 1;
  }
}
</style>
