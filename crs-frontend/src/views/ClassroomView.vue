<script setup>
/**
 * 教室列表页（对接后端 /api/classrooms）
 * 目的：提供列表入口，方便从列表跳转到详情页
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'
import logoUrl from '@/assets/images/logo.png'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 搜索关键词
const keyword = ref('')

// 教室列表数据
const classrooms = ref([])

// 教室名称：楼号 + 教室编号
const formatRoomName = (room) => {
  const building = room.building || ''
  const roomNum = room.roomNum || ''
  return `${building}${roomNum}` || '教室'
}

/** 获取教室列表（支持关键词筛选） */
const fetchClassrooms = async () => {
  try {
    const res = await request.get('/classrooms', {
      params: { keyword: keyword.value.trim() }
    })
    classrooms.value = Array.isArray(res) ? res : []
  } catch (error) {
    ElMessage.error('获取教室列表失败')
  }
}

/** 搜索 */
const handleSearch = () => {
  fetchClassrooms()
}

/** 跳转到教室详情 */
const goToDetail = (id) => {
  router.push(`/classroom/${id}`)
}

onMounted(() => {
  fetchClassrooms()
})
</script>

<template>
  <div class="classroom-list-page">
    <div class="header">
      <h1>教室列表</h1>
      <div class="search">
        <input v-model="keyword" placeholder="输入教室名称或位置" @keyup.enter="handleSearch" />
        <button @click="handleSearch">搜索</button>
      </div>
    </div>

    <div class="list">
      <div v-for="room in classrooms" :key="room.classroomId" class="card" @click="goToDetail(room.classroomId)">
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

<style scoped>
.classroom-list-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search {
  display: flex;
  gap: 10px;
}

.search input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.search button {
  height: 36px;
  padding: 0 16px;
  border: none;
  background: #409eff;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-4px);
}

.card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.info {
  padding: 16px;
}

.info h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.info p {
  color: #666;
  margin: 0 0 10px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #999;
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
