<template>
  <div class="page-container">
    <div class="page-card">
      <div class="profile-header">
        <h2>基本信息</h2>
        <div class="header-actions">
          <el-button type="primary" round @click="openBasicEditDialog">修改信息</el-button>
        </div>
      </div>

      <div class="profile-rows">
        <!-- 姓名 -->
        <div class="info-row">
          <div class="info-label">姓名</div>
          <div class="info-value">{{ form.realName || '--' }}</div>
        </div>

        <!-- 工号（账号） -->
        <div class="info-row">
          <div class="info-label">工号</div>
          <div class="info-value">{{ form.username || '--' }}</div>
        </div>

        <!-- 手机号 -->
        <div class="info-row">
          <div class="info-label">手机号</div>
          <div class="info-value">{{ form.phone || '未绑定' }}</div>
        </div>

        <!-- 邮箱 -->
        <div class="info-row">
          <div class="info-label">邮箱</div>
          <div class="info-value">{{ form.email || '未绑定' }}</div>
        </div>

        <!-- 身份 -->
        <div class="info-row">
          <div class="info-label">身份</div>
          <div class="info-value">管理员</div>
        </div>
      </div>
      <div class="bottom-actions">
        <el-button @click="openPwdDialog">修改密码</el-button>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="420px">
      <el-form :model="pwdForm" label-width="90px">
        <el-form-item label="原密码">
          <el-input v-model="pwdForm.oldPwd" type="password" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPwd" type="password" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="pwdForm.newPwdConfirm" type="password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确认</el-button>
      </template>
    </el-dialog>

    <!-- 基本信息修改弹窗：与教师/学生页保持一致，通过弹窗编辑 -->
    <el-dialog v-model="basicEditDialogVisible" title="修改个人信息" width="420px">
      <el-form :model="basicForm" label-width="90px">
        <el-form-item label="姓名">
          <el-input v-model="basicForm.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="工号">
          <el-input :model-value="form.username" disabled />
        </el-form-item>
        <el-form-item label="身份">
          <el-input model-value="管理员" disabled />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="basicForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="basicForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="basicEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveBasicEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * AdminProfileView - 管理员个人信息
 * 说明：复用用户中心接口，避免重复后端逻辑
 */
import { reactive, ref } from 'vue'
import { ElFormItem, ElMessage } from 'element-plus'
import request from '@/utils/request'

// ==================== 基本信息 ====================
const form = reactive({
  username: '',
  realName: '',
  phone: '',
  email: '',
  department: '',
  avatar: ''
})

// 基本信息弹窗编辑：与学生/教师页逻辑一致
const basicEditDialogVisible = ref(false)
const basicForm = reactive({
  realName: '',
  phone: '',
  email: ''
})

// ==================== 密码修改 ====================
const pwdDialogVisible = ref(false)
const pwdForm = reactive({
  oldPwd: '',
  newPwd: '',
  newPwdConfirm: ''
})

// 获取管理员信息（复用 /user/profile）
const fetchProfile = async () => {
  const res = await request.get('/user/profile')
  const user = res.user || {}
  form.username = user.username || ''
  form.realName = user.realName || user.real_name || ''
  form.phone = user.phone || ''
  form.email = user.email || ''
  form.avatar = user.avatar || ''

  basicForm.realName = form.realName
  basicForm.phone = form.phone
  basicForm.email = form.email
}

fetchProfile()

// 打开基本信息编辑弹窗
const openBasicEditDialog = () => {
  basicForm.realName = form.realName
  basicForm.phone = form.phone
  basicForm.email = form.email
  basicEditDialogVisible.value = true
}

// 保存弹窗中的联系方式
const handleSaveBasicEdit = async () => {
  await request.put('/user/profile', {
    realName: basicForm.realName,
    phone: basicForm.phone,
    email: basicForm.email,
    avatar: form.avatar
  })
  ElMessage.success('保存成功')
  basicEditDialogVisible.value = false
  fetchProfile()
}

// 打开密码弹窗
const openPwdDialog = () => {
  pwdForm.oldPwd = ''
  pwdForm.newPwd = ''
  pwdForm.newPwdConfirm = ''
  pwdDialogVisible.value = true
}

// 修改密码
const handleChangePassword = async () => {
  if (!pwdForm.oldPwd || !pwdForm.newPwd) {
    ElMessage.warning('请输入原密码和新密码')
    return
  }
  if (pwdForm.newPwd !== pwdForm.newPwdConfirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  await request.put('/user/password', {
    oldPwd: pwdForm.oldPwd,
    newPwd: pwdForm.newPwd
  })
  ElMessage.success('密码修改成功')
  pwdDialogVisible.value = false
}
</script>

<style scoped>
.page-card {
  background: #fff;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.profile-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.profile-rows {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  min-height: 66px;
  padding: 0 32px;
  border-radius: 14px;
  background: #f3f6f7;
}

.info-label {
  font-size: 16px;
  font-weight: 600;
  color: #455a64;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #2f4858;
}

.bottom-actions {
  margin-top: 18px;
  padding-top: 6px;
}

@media (max-width: 768px) {
  .page-card {
    padding: 18px;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .profile-header h2 {
    font-size: 22px;
  }

  .info-row {
    grid-template-columns: 88px 1fr;
    min-height: 56px;
    padding: 0 16px;
  }

  .info-label,
  .info-value {
    font-size: 16px;
  }
}
</style>
