<template>
  <div class="approval-detail">
    <NavBar :show-search="false" />

    <div class="content">
      <div class="header">
        <h1>审批详情</h1>
        <p>查看预约详细信息并进行审批。</p>
      </div>

      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="detail" class="card">
        <div class="row"><span class="label">教室</span><span class="value">{{ roomName }}</span></div>
        <div class="row"><span class="label">申请人</span><span class="value">{{ detail.applicant_name || '—' }}</span>
        </div>
        <div class="row"><span class="label">日期</span><span class="value">{{ detail.date }}</span></div>
        <div class="row"><span class="label">时间</span><span class="value">{{ detail.start_time }} - {{ detail.end_time
        }}</span></div>
        <div class="row"><span class="label">节次</span><span class="value">{{ formatPeriods(detail.period_ids) }}</span>
        </div>
        <div class="row"><span class="label">活动名称</span><span class="value">{{ detail.activity_name }}</span></div>
        <div class="row"><span class="label">活动类型</span><span class="value">{{ detail.activity_type }}</span></div>
        <div class="row"><span class="label">人数</span><span class="value">{{ detail.participant_count }}</span></div>
        <div class="row"><span class="label">用途说明</span><span class="value">{{ detail.purpose || '—' }}</span></div>
        <div class="row"><span class="label">状态</span><span class="value">{{ detail.status }}</span></div>

        <div class="actions">
          <button class="btn" :disabled="detail.status !== '待审批'" @click="approve">通过</button>
          <button class="btn-danger" :disabled="detail.status !== '待审批'" @click="reject">驳回</button>
          <button class="btn-outline" @click="router.back()">返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 审批详情页
 * - 拉取详情 /approvals/:id
 * - 提交审批 /approvals/:id/submit
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const detail = ref(null)

const roomName = computed(() => {
  if (!detail.value) return ''
  return `${detail.value.building || ''}${detail.value.room_num || ''}` || `教室${detail.value.classroom_id}`
})

const fetchDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get(`/approvals/${route.params.id}`)
    detail.value = res?.data || null
  } catch (err) {
    error.value = '获取详情失败'
  } finally {
    loading.value = false
  }
}

const formatPeriods = (periodIds) => {
  let ids = []
  if (Array.isArray(periodIds)) ids = periodIds
  else if (typeof periodIds === 'string') {
    try { ids = JSON.parse(periodIds) } catch { ids = [] }
  }
  return ids.length ? ids.map(id => `第${id}节`).join('，') : '—'
}

const approve = async () => {
  try {
    await ElMessageBox.confirm('确认通过该预约吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.post(`/approvals/${route.params.id}/submit`, { result: '通过' })
    ElMessage.success('已通过')
    fetchDetail()
  } catch {
    // 取消或失败
  }
}

const reject = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回理由（可选）', '驳回预约', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await request.post(`/approvals/${route.params.id}/submit`, { result: '驳回', reason: value || '' })
    ElMessage.success('已驳回')
    fetchDetail()
  } catch {
    // 取消或失败
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.approval-detail {
  min-height: 100vh;
  background: #f0f4f8;
}

.content {
  max-width: 900px;
  margin: 32px auto;
  padding: 0 20px 40px;
}

.header h1 {
  margin: 0 0 8px;
}

.state {
  padding: 40px;
  text-align: center;
  color: #666;
}

.state.error {
  color: #f56c6c;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: grid;
  gap: 10px;
}

.row {
  display: flex;
  gap: 10px;
}

.label {
  color: #666;
  min-width: 80px;
}

.value {
  color: #333;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 10px;
}

.btn {
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
}

.btn-outline {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #374151;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.btn:disabled,
.btn-danger:disabled {
  cursor: not-allowed;
  color: #9ca3af;
  border-color: #e5e7eb;
  background: #f3f4f6;
}
</style>
