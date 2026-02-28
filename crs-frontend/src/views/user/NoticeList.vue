<template>
  <div class="notice-page">
    <NavBar :show-search="false" />

    <div class="content">
      <div class="header">
        <h1>系统公告</h1>
        <p>查看最新公告与重要通知。</p>
      </div>

      <div class="filter-panel">
        <div class="filter-item">
          <label>关键字</label>
          <input v-model="keyword" type="text" placeholder="标题/内容" />
        </div>
        <button class="reset-btn" @click="handleReset">清空筛选</button>
        <button class="btn" @click="handleSearch">查询</button>
      </div>

      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="!list.length" class="state">暂无公告</div>

      <div v-else class="list">
        <div v-for="item in list" :key="item.id" class="card" @click="openDetail(item.id)">
          <div class="card-header">
            <div class="title">
              <span class="room">{{ item.title }}</span>
              <span v-if="item.isTop" class="tag">置顶</span>
            </div>
            <div class="meta">发布时间：{{ formatTime(item.publishTime) }}</div>
          </div>
          <div class="card-body">
            <div class="row">
              <span class="label">内容</span>
              <span class="value">{{ item.summary }}</span>
            </div>
            <div class="row">
              <span class="label">有效期</span>
              <span class="value">{{ item.expireTime || '长期有效' }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-outline" @click.stop="openDetail(item.id)">查看详情</button>
          </div>
        </div>
      </div>

      <div v-if="total > 0" class="pagination">
        <span class="page-info">共 {{ total }} 条</span>
        <button class="page-btn" :disabled="page === 1" @click="handlePageChange(page - 1)">上一页</button>
        <span class="page-num">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page === totalPages" @click="handlePageChange(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 系统公告列表（用户侧）
 * - 支持分页与关键词查询
 * - 点击卡片进入详情页
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 时间格式化（YYYY-MM-DD HH:mm）
const formatTime = (time) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return String(time)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

// 简单摘要（去空白、截断）
const buildSummary = (content) => {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '—'
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
}

const normalizeRow = (row) => {
  return {
    id: row.announcement_id ?? row.announcementId ?? row.id,
    title: row.title,
    content: row.content,
    publishTime: row.publish_time ?? row.publishTime,
    expireTime: row.expire_time ?? row.expireTime,
    isTop: Number(row.is_top ?? row.isTop ?? 0),
    viewCount: Number(row.view_count ?? row.viewCount ?? 0),
    summary: buildSummary(row.content)
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const fetchList = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get('/announcements', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined
      }
    })
    const rows = Array.isArray(res?.data) ? res.data : []
    list.value = rows.map(normalizeRow)
    total.value = res?.pagination?.total || 0
  } catch (err) {
    error.value = '获取公告失败，请稍后再试'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}

const handleReset = () => {
  keyword.value = ''
  page.value = 1
  fetchList()
}

const handlePageChange = (nextPage) => {
  page.value = nextPage
  fetchList()
}

const handleSizeChange = () => {
  page.value = 1
  fetchList()
}

const openDetail = (id) => {
  router.push(`/notice/${id}`)
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.notice-page {
  min-height: 100vh;
  background: #f0f4f8;
}

.content {
  max-width: 1100px;
  margin: 32px auto;
  padding: 0 20px 40px;
}

.header h1 {
  margin: 0 0 8px;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  margin: 16px 0 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.btn,
.reset-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: #2ecc71;
  color: #fff;
}

.reset-btn {
  background: #64748b;
}

.state {
  text-align: center;
  padding: 40px 0;
  color: #64748b;
}

.state.error {
  color: #ef4444;
}

.list {
  display: grid;
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  padding: 18px 20px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.tag {
  background: #f59e0b;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.meta {
  color: #6b7280;
  font-size: 13px;
}

.card-body .row {
  display: flex;
  gap: 12px;
  padding: 6px 0;
}

.card-body .label {
  color: #6b7280;
  min-width: 60px;
}

.card-body .value {
  color: #111827;
}

.card-actions {
  margin-top: 12px;
}

.btn-outline {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid #2ecc71;
  background: #fff;
  color: #2ecc71;
  cursor: pointer;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
}

.page-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.page-btn:disabled {
  cursor: not-allowed;
  color: #cbd5e1;
}

.page-num {
  color: #475569;
}
</style>
