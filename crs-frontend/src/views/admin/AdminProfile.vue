<template>
  <AdminLayout breadcrumb="管理员个人信息">
    <div class="page-card">
      <!-- 基本信息表单 -->
      <el-form :model="form" label-width="90px" class="profile-form">
        <el-form-item label="账号">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-tag type="success">管理员</el-tag>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <!-- <el-form-item label="院系编码">
          <el-input v-model="form.department" placeholder="如：CS" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="form.avatar" placeholder="可选" />
        </el-form-item> -->
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存信息</el-button>
          <el-button @click="openPwdDialog">修改密码</el-button>
        </el-form-item>
      </el-form>
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
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确认</el-button>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<script setup>
/**
 * AdminProfileView - 管理员个人信息
 * 说明：复用用户中心接口，避免重复后端逻辑
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AdminLayout from '@/components/AdminLayout.vue'
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

// ==================== 密码修改 ====================
const pwdDialogVisible = ref(false)
const pwdForm = reactive({
  oldPwd: '',
  newPwd: ''
})

// 获取管理员信息（复用 /user/profile）
const fetchProfile = async () => {
  const res = await request.get('/user/profile')
  const user = res.user || {}
  form.username = user.username || ''
  form.realName = user.realName || user.real_name || ''
  form.phone = user.phone || ''
  form.email = user.email || ''
  form.department = user.department || ''
  form.avatar = user.avatar || ''
}

fetchProfile()

// 保存信息
const handleSave = async () => {
  await request.put('/user/profile', {
    realName: form.realName,
    phone: form.phone,
    email: form.email,
    department: form.department,
    avatar: form.avatar
  })
  ElMessage.success('保存成功')
  fetchProfile()
}

// 打开密码弹窗
const openPwdDialog = () => {
  pwdForm.oldPwd = ''
  pwdForm.newPwd = ''
  pwdDialogVisible.value = true
}

// 修改密码
const handleChangePassword = async () => {
  if (!pwdForm.oldPwd || !pwdForm.newPwd) {
    ElMessage.warning('请输入原密码和新密码')
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
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.profile-form {
  max-width: 520px;
}
</style>
