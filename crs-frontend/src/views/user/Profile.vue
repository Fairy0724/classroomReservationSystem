<!-- ProfileView.vue -->
<template>
  <div>
    <!-- 顶部导航 -->
    <NavBar :keyword="searchQuery" :show-search="true" :show-classroom-link="true"
      @update:keyword="searchQuery = $event" @search="handleSearch" />

    <div class="profile-page container">
      <!-- 左侧菜单：用户信息与功能菜单 -->
      <div class="profile-sidebar">
        <div class="user-card">
          <div class="avatar-wrapper">
            <img :src="userStore.userInfo?.avatar || logoUrl" :alt="userStore.userInfo?.username"
              referrerpolicy="no-referrer" @error="handleAvatarError">
            <label class="upload-avatar" title="更换头像">
              <input type="file" accept="image/*" style="display:none" @change="handleAvatarChange" />
              <i class="el-icon-camera"></i>
            </label>
          </div>
          <h3>{{ userStore.userInfo?.realName }}</h3>
          <p class="user-level">
            <!-- 身份展示：学生 / 教师 / 管理员 -->
            <i class="el-icon-user"></i>
            {{ roleLabel }}
          </p>
        </div>
        <!-- 功能菜单：基本信息、安全设置、个人设置 -->
        <div class="menu-list">
          <div v-for="menu in menuItems" :key="menu.key" :class="['menu-item', { active: currentMenu === menu.key }]"
            @click="currentMenu = menu.key">
            <i :class="menu.icon"></i>
            {{ menu.label }}
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="profile-content">
        <!-- 基本信息：适配教室预约系统字段 -->
        <div v-if="currentMenu === 'basic'" class="content-card">
          <div class="card-header">
            <h2>基本信息</h2>
            <!-- <el-button type="primary" @click="editMode = !editMode">
              {{ editMode ? '保存' : '编辑' }}
            </el-button> -->
            <!-- 仅展示，不支持编辑 -->
          </div>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ userStore.userInfo?.realName }}</span>
            </div>
            <div class="info-item">
              <!-- 判断身份，学生展示学号，教师展示工号 -->
              <template v-if="roleLabel === '学生'">
                <span class="info-label">学号</span>
                <span class="info-value">{{ userStore.userInfo?.username }}</span>
              </template>
              <template v-else>
                <span class="info-label">工号</span>
                <span class="info-value">{{ userStore.userInfo?.username }}</span>
              </template>
            </div>

            <div class="info-item">
              <span class="info-label">手机号</span>
              <span class="info-value">{{ userStore.userInfo?.phone || '未绑定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ userStore.userInfo?.email || '未绑定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">身份</span>
              <span class="info-value">{{ roleLabel }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">学院</span>
              <span class="info-value">{{ userStore.userInfo?.department }}</span>
            </div>
            <!-- <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(userStore.userInfo?.createTime) }}</span>
            </div> -->
          </div>
        </div>

        <!-- 我的预约：替换商城“地址/收藏” -->
        <div v-if="currentMenu === 'reservations'" class="content-card">
          <div class="card-header">
            <h2>我的预约</h2>
            <div class="card-actions">
              <el-button type="primary" @click="goToClassrooms">去预约</el-button>
              <el-button @click="goToMyReservations">查看全部</el-button>
              <el-button @click="exportReservationsInProfile">导出预约</el-button>
            </div>
          </div>

          <!-- 预约统计：帮助用户快速了解当前状态 -->
          <div class="reservation-stats">
            <div class="stat-item">
              <span class="stat-number">{{ reservationStats.total }}</span>
              <span class="stat-label">总预约</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ reservationStats.pending }}</span>
              <span class="stat-label">待审批</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ reservationStats.approved }}</span>
              <span class="stat-label">已通过</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ reservationStats.rejected }}</span>
              <span class="stat-label">已驳回</span>
            </div>
          </div>

          <div v-if="reservationList.length === 0" class="empty-state">
            <p>暂无预约记录</p>
            <RouterLink to="/classrooms" class="btn-primary">去预约教室</RouterLink>
          </div>
          <div v-else class="reservation-grid">
            <div v-for="item in reservationList" :key="item.id" class="reservation-card">
              <div class="reservation-header">
                <div>
                  <h3>{{ item.classroomName }}</h3>
                  <p class="reservation-meta">{{ item.date }} · {{ item.time }}</p>
                </div>
                <span :class="['status-tag', statusClass(item.status)]">{{ item.status }}</span>
              </div>
              <div class="reservation-body">
                <p><span class="label">用途：</span>{{ item.purpose }}</p>
                <p><span class="label">地点：</span>{{ item.location }}</p>
              </div>
              <div class="reservation-actions">
                <el-button link @click="goToClassroomDetail(item.classroomId)">查看教室</el-button>
              </div>
            </div>
          </div>

          <!-- 数据来源说明 -->
          <p class="helper-text">数据来自后端“我的预约”接口。</p>
        </div>

        <!-- 账号安全 -->
        <div v-if="currentMenu === 'security'" class="content-card">
          <h2>账号安全</h2>
          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <h3>登录密码</h3>
                <p>建议您定期更换密码，设置安全性高的密码可以使账号更安全</p>
              </div>
              <el-button @click="showPwdDialog = true">修改</el-button>
            </div>
            <div class="security-item">
              <div class="security-info">
                <h3>手机号验证</h3>
                <!-- 默认都绑定了 -->

                <template>
                  <p>已绑定：{{ userStore.userInfo?.phone }}</p>
                </template>
              </div>
              <el-button @click="showPhoneDialog = true">修改</el-button>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog title="修改密码" v-model="showPwdDialog" width="400px">
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="90px">
        <el-form-item label="原密码" prop="oldPwd">
          <el-input v-model="pwdForm.oldPwd" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPwd">
          <el-input v-model="pwdForm.newPwd" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPwd">
          <el-input v-model="pwdForm.confirmPwd" type="password" show-password></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPwdDialog = false">取消</el-button>
        <el-button type="primary" @click="handleChangePwd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改手机号弹窗 -->
    <el-dialog title="修改手机号" v-model="showPhoneDialog" width="400px">
      <el-form :model="phoneForm" :rules="phoneRules" ref="phoneFormRef" label-width="90px">
        <el-form-item label="新手机号" prop="newPhone">
          <el-input v-model="phoneForm.newPhone"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPhoneDialog = false">取消</el-button>
        <el-button type="primary" @click="handleChangePhone">确定</el-button>
      </template>
    </el-dialog>


  </div>

</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import { useUserStore } from '@/stores/userStore';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';
import logoUrl from '@/assets/images/logo.png';
import { exportReservationsCsv } from '@/utils/reservationExport';

// 路由与用户状态
const router = useRouter();
const userStore = useUserStore();
const isLogin = computed(() => !!userStore.token);

// 当前菜单与编辑状态
const currentMenu = ref('basic');
const editMode = ref(false);

// 用户编辑表单（仅用于前端展示/编辑）
const userForm = ref({
  username: '',
  realName: '',
  phone: '',
  email: '',
  department: ''
});

// 顶部搜索（按教室关键字筛选）
const searchQuery = ref('');

const menuItems = [
  { key: 'basic', label: '基本信息', icon: 'el-icon-user' },
  { key: 'reservations', label: '我的预约', icon: 'el-icon-date' },
  { key: 'security', label: '账号安全', icon: 'el-icon-lock' }
];

// 角色显示文本（与教室预约系统一致）
const roleLabel = computed(() => {
  const role = userStore.userInfo?.role;
  if (role === 'admin') return '管理员';
  if (role === 'teacher') return '教师';
  if (role === 'student') return '学生';
  return '未设置';
});

// 学号/工号展示
const userIdLabel = computed(() => {
  const role = userStore.userInfo?.role;
  if (role === 'teacher') return '工号';
  if (role === 'student') return '学号';
  return '账号编号';
});

const userIdValue = computed(() => {
  return (
    userStore.userInfo?.jobNo ||
    userStore.userInfo?.studentNo ||
    userStore.userInfo?.id ||
    '未填写'
  );
});

// 我的预约列表（来自后端）
const reservationList = ref([]);

const reservationStats = computed(() => {
  const total = reservationList.value.length;
  const pending = reservationList.value.filter(item => item.status === '待审批').length;
  const approved = reservationList.value.filter(item => item.status === '已通过').length;
  const rejected = reservationList.value.filter(item => item.status === '已驳回').length;
  return { total, pending, approved, rejected };
});

// 搜索处理：跳转教室列表并传关键字
const handleSearch = () => {
  const keyword = searchQuery.value.trim();
  if (keyword) {
    router.push({
      name: 'classroomList',
      query: { keyword }
    });
  }
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '未知';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 解析节次数组（兼容数组 / JSON字符串）
const parsePeriodIds = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// 格式化节次文本（与“我的预约页”的“节次”字段一致）
const formatPeriodsText = (periodIds) => {
  const ids = parsePeriodIds(periodIds);
  if (!ids.length) return '—';
  return ids.map(id => `第${id}节`).join('，');
};

// 预约状态映射
const formatStatus = (status) => {
  if (status === 'pending') return '待审批';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return status || '未知';
};

// 获取我的预约列表（后端）
const fetchReservations = async () => {
  try {
    const res = await request.get('/reservations/my');
    const list = Array.isArray(res?.data) ? res.data : [];

    // 组装时段文案：优先显示“开始-结束”，无时间时回退“第N节”
    const formatTimeText = (item) => {
      if (item.start_time && item.end_time) {
        return `${String(item.start_time).slice(0, 5)}-${String(item.end_time).slice(0, 5)}`;
      }
      return formatPeriodsText(item.period_ids);
    };

    const mapped = await Promise.all(
      list.map(async (item) => {
        let classroom = null;
        try {
          const classroomRes = await request.get('/classrooms', {
            // 兼容后端字段 classroom_id
            params: { id: item.classroomId ?? item.classroom_id }
          });
          classroom = Array.isArray(classroomRes) ? classroomRes[0] : classroomRes;
        } catch (error) {
          classroom = null;
        }

        const classroomName = classroom
          ? `${classroom.building || ''}${classroom.roomNum || ''}`
          : `教室 ${item.classroomId ?? item.classroom_id ?? ''}`;
        const location = classroom
          ? `${classroom.building || ''}-${classroom.floor || ''}层`
          : '未知';

        return {
          // 关键修复：后端主键是 reservation_id，不是 id
          id: item.id ?? item.reservation_id,
          // 导出专用：与“我的预约页”字段名对齐
          reservationId: item.id ?? item.reservation_id,
          classroomId: item.classroomId ?? item.classroom_id,
          classroomName,
          location,
          date: item.date,
          reservationDate: item.date,
          startTime: String(item.start_time || '').slice(0, 8),
          endTime: String(item.end_time || '').slice(0, 8),
          periods: formatPeriodsText(item.period_ids),
          activityName: item.activityName || item.activity_name || '',
          activityType: item.activityType || item.activity_type || '',
          participantCount: item.participantCount ?? item.participant_count ?? '',
          submittedAt: item.submittedAt || item.submitted_at,
          time: formatTimeText(item),
          status: formatStatus(item.status),
          purpose: item.purpose || item.activityName || item.activity_name || '—'
        };
      })
    );

    reservationList.value = mapped;
  } catch (error) {
    ElMessage.error('获取预约记录失败');
    reservationList.value = [];
  }
};

// 页面跳转快捷入口
const goToClassrooms = () => router.push({ name: 'classroomList' });
const goToMyReservations = () => router.push({ name: 'myReservations' });
const goToClassroomDetail = (id) => router.push({ name: 'classroomDetail', params: { id } });

// 预约状态样式
const statusClass = (status) => {
  if (status === '待审批') return 'status-pending';
  if (status === '已通过') return 'status-approved';
  if (status === '已驳回') return 'status-rejected';
  return 'status-default';
};

// 个人中心“我的预约”导出
const exportReservationsInProfile = () => {
  // 个人中心数据已在 fetchReservations 中对齐为导出所需字段
  const exportedCount = exportReservationsCsv(reservationList.value, {
    filenamePrefix: '我的预约_个人中心'
  });

  if (!exportedCount) {
    ElMessage.warning('当前没有可导出的预约记录');
    return;
  }

  ElMessage.success(`已导出 ${exportedCount} 条预约记录`);
};

// 编辑模式切换：进入时填表，退出时保存
watch(editMode, (newValue) => {
  if (newValue) {
    userForm.value = {
      username: userStore.userInfo?.username || '',
      realName: userStore.userInfo?.realName || '',
      phone: userStore.userInfo?.phone || '',
      email: userStore.userInfo?.email || '',
      department: userStore.userInfo?.department || ''
    };
  } else {
    saveUserInfo();
  }
});

// 保存用户信息（接入后端）
const saveUserInfo = async () => {
  try {
    if (!userStore.userInfo) return;
    const payload = {
      username: userForm.value.username,
      realName: userForm.value.realName,
      phone: userForm.value.phone,
      email: userForm.value.email,
      department: userForm.value.department
    };
    await userStore.updateProfile(payload);
    ElMessage.success('保存成功');
  } catch (error) {
    ElMessage.error('保存失败');
    editMode.value = true;
  }
};

// 修改密码弹窗与表单
const showPwdDialog = ref(false);
const pwdFormRef = ref();
const pwdForm = ref({ oldPwd: '', newPwd: '', confirmPwd: '' });
const pwdRules = {
  oldPwd: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPwd: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.value.newPwd) {
          callback(new Error('两次输入的新密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

// 修改密码逻辑（接入后端）
const handleChangePwd = async () => {
  await pwdFormRef.value.validate();
  await userStore.changePassword(pwdForm.value.oldPwd, pwdForm.value.newPwd);
  ElMessage.success('密码修改成功');
  showPwdDialog.value = false;
  pwdForm.value = { oldPwd: '', newPwd: '', confirmPwd: '' };
};

// 修改手机号弹窗与表单
const showPhoneDialog = ref(false);
const phoneFormRef = ref();
const phoneForm = ref({ newPhone: '' });
const phoneRules = {
  newPhone: [
    { required: true, message: '请输入新手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号必须为11位数字', trigger: 'blur' }
  ]
};

// 修改手机号逻辑
const handleChangePhone = async () => {
  await phoneFormRef.value.validate();
  await userStore.updatePhone(phoneForm.value.newPhone);
  ElMessage.success('手机号修改成功');
  showPhoneDialog.value = false;
  phoneForm.value = { newPhone: '' };
};



// 头像加载失败兜底（防止外链防盗链/404）
const handleAvatarError = (event) => {
  event.target.src = logoUrl;
};

// 头像上传处理（接入后端）
const handleAvatarChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }
  // // 简单大小限制（避免 413）
  // if (file.size > 1024 * 1024) {
  //   ElMessage.error('图片过大，请选择 1MB 以内的图片');
  //   return;
  // }
  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    if (!userStore.userInfo) return;
    await userStore.updateProfile({ avatar: base64 });
    ElMessage.success('头像更新成功');
  };
  reader.readAsDataURL(file);
};

// 初始化
onMounted(async () => {
  if (isLogin.value) {
    await userStore.fetchProfile();
    userForm.value = {
      username: userStore.userInfo?.username || '',
      realName: userStore.userInfo?.realName || '',
      phone: userStore.userInfo?.phone || '',
      email: userStore.userInfo?.email || '',
      department: userStore.userInfo?.department || ''
    };
    fetchReservations();
  }
});
</script>

<style scoped>
.profile-page {
  display: flex;
  gap: 30px;
  padding: 30px;
  background-color: #f8faf8;
  min-height: calc(100vh - 60px);
  max-width: 1400px;
  margin: 0 auto;
}

.profile-sidebar {
  background: #fff;
  border-radius: 16px;
  padding: 35px;
  height: fit-content;
  box-shadow: 0 4px 20px rgba(46, 204, 113, 0.1);
  width: 280px;
  flex-shrink: 0;
}

.profile-content {
  flex: 1;
}

.content-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(46, 204, 113, 0.1);
  margin-bottom: 30px;
}

.content-card h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 35px;
  /* 移除断线 */
  padding-bottom: 25px;
  color: #2c3e50;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  /* 移除断线 */
}

/* 空状态提示 */
.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

/* 信息项样式 */
.info-item {
  display: flex;
  align-items: center;
  padding: 20px 30px;
  border-radius: 12px;
  margin-bottom: 15px;
  background: #f8faf8;
  transition: all 0.3s;
}

.info-item:hover {
  background: #f0f9f0;
  transform: translateX(5px);
}

.info-label {
  width: 120px;
  color: #666;
  font-size: 15px;
  font-weight: 500;
}

.info-value {
  flex: 1;
  color: #2c3e50;
  font-size: 15px;
}

/* 预约统计与列表样式（适配教室预约） */
.card-actions {
  display: flex;
  gap: 12px;
}

.reservation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin: 20px 0 30px;
}

.stat-item {
  background: #f8faf8;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: #2ecc71;
}

.stat-label {
  color: #666;
  font-size: 13px;
  margin-top: 6px;
}

.reservation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.reservation-card {
  background: #f8faf8;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.reservation-card:hover {
  border-color: #2ecc71;
  transform: translateY(-4px);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.12);
}

.reservation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reservation-header h3 {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 6px;
}

.reservation-meta {
  color: #666;
  font-size: 13px;
}

.reservation-body {
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.reservation-body .label {
  color: #888;
}

.reservation-actions {
  margin-top: 12px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-approved {
  background: #f0f9f0;
  color: #2ecc71;
}

.status-rejected {
  background: #fef0f0;
  color: #f56c6c;
}

.status-default {
  background: #f4f4f5;
  color: #909399;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 30px 0;
}

.btn-primary {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: 20px;
  background: #2ecc71;
  color: #fff;
}

.btn-primary:hover {
  background: #27ae60;
}

.helper-text {
  margin-top: 18px;
  color: #999;
  font-size: 12px;
}

/* 地址列表样式 */
.address-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.address-item {
  padding: 25px;
  border-radius: 12px;
  background: #f8faf8;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.address-item:hover {
  border-color: #2ecc71;
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.1);
}

.contact {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.phone {
  color: #666;
}

.address {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.address-actions {
  display: flex;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #e8f3e8;
}

/* 安全设置样式 */
.security-list {
  margin-top: 30px;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  background: #f8faf8;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.security-item:hover {
  background: #f0f9f0;
  transform: translateX(5px);
}

.security-info h3 {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 600;
}

.security-info p {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.el-input) {
  flex: 1;
}

:deep(.el-input__inner) {
  background: #ffffff;
  border-color: #e8f3e8;
  border-radius: 8px;
  height: 40px;
}

:deep(.el-input__inner:focus) {
  border-color: #2ecc71;
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
}

:deep(.el-button--primary) {
  background-color: #2ecc71;
  border-color: #2ecc71;
  border-radius: 20px;
  padding: 8px 20px;
}

:deep(.el-button--primary:hover) {
  background-color: #27ae60;
  border-color: #27ae60;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.2);
}

/* 用户卡片和菜单样式 */
.user-card {
  text-align: center;
  padding-bottom: 35px;
  border-bottom: 2px solid #e8f3e8;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 25px;
}

.avatar-wrapper img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #e8f3e8;
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.2);
}

.upload-avatar {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  background: #2ecc71;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
  transition: all 0.3s;
}

.upload-avatar:hover {
  transform: scale(1.1);
  background: #27ae60;
}

.upload-avatar i {
  color: white;
  font-size: 18px;
}

.user-card h3 {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 10px;
  font-weight: 600;
}

.user-level {
  color: #2ecc71;
  font-size: 15px;
  background: #f0f9f0;
  padding: 6px 12px;
  border-radius: 20px;
  display: inline-block;
  margin-top: 10px;
}

.menu-list {
  margin-top: 25px;
}

.menu-item {
  padding: 16px 22px;
  color: #666;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  font-size: 16px;
}

.menu-item:hover {
  background: #f0f9f0;
  color: #2ecc71;
  transform: translateX(5px);
}

.menu-item.active {
  background: #2ecc71;
  color: #fff;
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.2);
}

.menu-item i {
  margin-right: 12px;
  font-size: 18px;
}

/* Element Plus 按钮样式覆盖 */
:deep(.el-button--primary) {
  background-color: #2ecc71;
  border-color: #2ecc71;
}

:deep(.el-button--primary:hover) {
  background-color: #27ae60;
  border-color: #27ae60;
}

:deep(.el-button--text) {
  color: #2ecc71;
}

:deep(.el-button--text:hover) {
  color: #27ae60;
}

/* 商品卡片样式 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
  margin-top: 30px;
}

.product-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  overflow: hidden;
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-image {
  position: relative;
  overflow: hidden;
  height: 300px;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.discount-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: #f56c6c;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10;
}

.quick-view-btn {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: pointer;
  z-index: 20;
  border: none;
}

.product-card:hover .quick-view-btn {
  bottom: 20px;
  opacity: 1;
}

.quick-view-btn:hover {
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-info {
  padding: 20px;
}

.brand {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.product-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.4;
  height: 44px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: #333;
}

.price {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.current-price {
  font-size: 20px;
  font-weight: 600;
  color: #2ecc71;
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-heart,
.btn-cart {
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  border: none;
  flex: 1;
}

.btn-heart {
  background: #fff;
  border: 1px solid #f56c6c;
  color: #f56c6c;
}

.btn-heart:hover {
  background: #fef0f0;
}

.btn-cart {
  background: #2ecc71;
  color: white;
}

.btn-cart:hover {
  background: #27ae60;
}
</style>
