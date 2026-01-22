<!-- ProfileView.vue -->
<template>
  <div>
    <!-- 顶部导航 -->
    <nav class="nav-container">
      <div class="nav-wrapper">
        <div class="logo">
          <img src="../assets/images/logo.png" alt="荔枝烧蓝莓 Logo">
        </div>
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="搜索商品..." @keyup.enter="handleSearch">
          <button class="search-btn" @click="handleSearch">
            <i class="fa fa-search"></i>
          </button>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <template v-if="userStore.isLogin">
            <RouterLink to="/profile" class="nav-link">个人中心</RouterLink>
            <RouterLink :to="{ name: 'cart' }" class="nav-link cart-link">购物车</RouterLink>
            <RouterLink :to="{ name: 'orders' }" class="nav-link">订单</RouterLink>
            <a href="#" class="nav-link" @click.prevent="logout">退出登录</a>
          </template>
          <template v-else>
            <RouterLink to="/login" class="nav-link">登录</RouterLink>
            <RouterLink to="/register" class="nav-link">注册</RouterLink>
          </template>
        </div>
      </div>
    </nav>

    <div class="profile-page container">
      <!-- 左侧菜单 -->
      <div class="profile-sidebar">
        <div class="user-card">
          <div class="avatar-wrapper">
            <img :src="userStore.userInfo?.avatar || 'https://via.placeholder.com/120'"
              :alt="userStore.userInfo?.username">
            <label class="upload-avatar" title="更换头像">
              <input type="file" accept="image/*" style="display:none" @change="handleAvatarChange" />
              <i class="el-icon-camera"></i>
            </label>
          </div>
          <h3>{{ userStore.userInfo?.username }}</h3>
          <p class="user-level">
            <i class="el-icon-trophy"></i>
            普通会员
          </p>
        </div>

        <div class="menu-list">
          <div v-for="menu in menuItems" :key="menu.key" :class="['menu-item', { active: currentMenu === menu.key }]"
            @click="currentMenu = menu.key">
            <i :class="menu.icon"></i>
            {{ menu.label }}
            <span v-if="menu.count" class="badge">{{ menu.count }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="profile-content">
        <!-- 基本信息 -->
        <div v-if="currentMenu === 'basic'" class="content-card">
          <div class="card-header">
            <h2>基本信息</h2>
            <el-button type="primary" @click="editMode = !editMode">
              {{ editMode ? '保存' : '编辑' }}
            </el-button>
          </div>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">用户名</span>
              <template v-if="editMode">
                <el-input v-model="userForm.username" placeholder="请输入用户名" />
              </template>
              <span v-else class="info-value">{{ userStore.userInfo?.username }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">手机号</span>
              <template v-if="editMode">
                <el-input v-model="userForm.phone" placeholder="请输入手机号" />
              </template>
              <span v-else class="info-value">{{ userStore.userInfo?.phone || '未绑定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <template v-if="editMode">
                <el-input v-model="userForm.email" placeholder="请输入邮箱" />
              </template>
              <span v-else class="info-value">{{ userStore.userInfo?.email || '未绑定' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">会员等级</span>
              <span class="info-value">普通会员</span>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(userStore.userInfo?.createTime) }}</span>
            </div>
          </div>
        </div>
        <!-- 收货地址 -->
        <div v-if="currentMenu === 'address'" class="content-card">
          <div class="card-header">
            <h2>收货地址</h2>
          </div>

          <div class="address-list">
            <div v-if="addresses.length === 0" class="empty-tip">
              暂无收货地址
            </div>
            <div v-else v-for="addr in addresses" :key="addr.id" class="address-item">
              <div class="address-info">
                <div class="contact">
                  <span class="name">{{ addr.name }}</span>
                  <span class="phone">{{ addr.phone }}</span>
                  <span v-if="addr.isDefault" class="default-tag">默认</span>
                </div>
                <div class="address">
                  {{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}
                </div>
              </div>
              <div class="address-actions">
                <el-button link @click="editAddress(addr)">编辑</el-button>
                <el-button link @click="deleteAddress(addr.id)">删除</el-button>
                <el-button v-if="!addr.isDefault" link @click="setDefaultAddress(addr.id)">
                  设为默认
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 我的收藏 -->
        <div v-if="currentMenu === 'favorites'" class="content-card">
          <h2>我的收藏</h2>
          <div v-if="favorites.length === 0" class="empty-state">
            <img src="../assets/images/none.png" alt="暂无收藏">
            <p>您还没有收藏任何商品</p>
            <RouterLink to="/" class="btn-primary">去逛逛</RouterLink>
          </div>
          <div v-else class="product-grid">
            <div v-for="item in favorites" :key="item.id" class="product-card" @click="goToProduct(item.productId)">
              <div class="product-image">
                <img :src="item.product.mainImage" :alt="item.product.name">
                <div v-if="item.product.discount" class="discount-badge">{{ item.product.discount }}折</div>
                <button class="quick-view-btn" @click.stop="goToProduct(item.productId)">
                  <i class="fa fa-eye"></i> 查看详情
                </button>
              </div>
              <div class="product-info">
                <div class="brand">{{ item.product.brandName || '美妆商城' }}</div>
                <h3>{{ item.product.name }}</h3>
                <div class="price">
                  <span class="current-price">¥{{ item.product.price }}</span>
                  <span v-if="item.product.originalPrice" class="original-price">¥{{ item.product.originalPrice
                    }}</span>
                </div>
                <div class="actions">
                  <button class="btn-heart" @click.stop="removeFavorite(item.id)">
                    <i class="fa fa-heart"></i> 取消收藏
                  </button>
                  <button class="btn-cart" @click.stop="goToProduct(item.productId)">
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                <p>已绑定：{{ userStore.userInfo?.phone }}</p>
              </div>
              <el-button @click="showPhoneDialog = true">修改</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地址编辑弹窗 -->
    <el-dialog :title="addressForm.id ? '编辑地址' : '新增地址'" v-model="showAddress" width="500px">
      <el-form :model="addressForm" label-width="80px">
        <el-form-item label="收货人">
          <el-input v-model="addressForm.name"></el-input>
        </el-form-item>
        <el-form-item label="手机号码">
          <el-input v-model="addressForm.phone"></el-input>
        </el-form-item>
        <el-form-item label="所在地区">
          <el-cascader v-model="addressForm.region" :options="regionData" placeholder="请选择省/市/区"></el-cascader>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input type="textarea" v-model="addressForm.detail" placeholder="请输入详细地址信息"></el-input>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="addressForm.isDefault">设为默认地址</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddress = false">取消</el-button>
        <el-button type="primary" @click="saveAddress">确定</el-button>
      </template>
    </el-dialog>

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
import { ref, onMounted, watch, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import request from '../utils/http';
import { ElMessage } from 'element-plus';
import '../assets/styles/nav.css';

const router = useRouter();
const userStore = useUserStore();
const currentMenu = ref('basic');
const addresses = ref([]);
const showAddress = ref(false);
const editMode = ref(false);

// 数据是否已加载的标志
const dataLoaded = ref(false);

// 用户编辑表单
const userForm = ref({
  username: '',
  phone: '',
  email: ''
});

// 地址编辑表单
const addressForm = ref({
  id: '',
  name: '',
  phone: '',
  region: [],
  detail: '',
  isDefault: false
});

// 省市区数据（示例数据）
const regionData = [
  {
    label: '广东省',
    value: '广东省',
    children: [
      {
        label: '深圳市',
        value: '深圳市',
        children: [
          { label: '南山区', value: '南山区' },
          { label: '福田区', value: '福田区' }
        ]
      }
    ]
  }
];

const menuItems = [
  { key: 'basic', label: '基本信息', icon: 'el-icon-user' },
  { key: 'address', label: '收货地址', icon: 'el-icon-location' },
  { key: 'favorites', label: '我的收藏', icon: 'el-icon-star' },
  { key: 'security', label: '账号安全', icon: 'el-icon-lock' }
];

const searchQuery = ref('');

// 收藏列表
const favorites = ref([]);

// 搜索处理
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: 'select',
      query: { q: searchQuery.value }
    });
  }
};

// 格式化日期-使用于收藏列表
const formatDate = (date) => {
  if (!date) return '未知';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 获取收货地址列表
const fetchAddresses = async () => {
  try {
    if (userStore.userInfo?.id) {
      const res = await request.get(`/addresses?userId=${userStore.userInfo.id}`);
      addresses.value = Array.isArray(res) ? res : [];
    }
  } catch (error) {
    console.error('获取地址列表失败:', error);
    ElMessage.error('获取地址列表失败');
    addresses.value = [];
  }
};

// 编辑地址
const editAddress = (addr) => {
  addressForm.value = { ...addr };
  showAddress.value = true;
};

// 删除地址
const deleteAddress = async (id) => {
  try {
    await request.delete(`/addresses/${id}`);
    await fetchAddresses();
    ElMessage.success('删除成功');
  } catch (error) {
    console.error('删除地址失败:', error);
    ElMessage.error('删除失败');
  }
};

// 设置默认地址
const setDefaultAddress = async (id) => {
  try {
    // 先将所有地址设为非默认
    await Promise.all(
      addresses.value.map(addr =>
        request.put(`/addresses/${addr.id}`, {
          ...addr,
          isDefault: addr.id === id
        })
      )
    );
    // 然后将指定地址设为默认
    await fetchAddresses();
    ElMessage.success('设置成功');
  } catch (error) {
    console.error('设置默认地址失败:', error);
    ElMessage.error('设置失败');
  }
};

// 保存地址
const saveAddress = async () => {
  try {
    // 验证表单
    const addressData = {
      ...addressForm.value,
      userId: userStore.userInfo.id
    };

    // 如果有省市区数据，则合并成一个字符串
    if (addressForm.value.id) {
      await request.put(`/addresses/${addressForm.value.id}`, addressData);
    } else {
      await request.post('/addresses', addressData);
    }

    showAddress.value = false;
    await fetchAddresses();
    ElMessage.success('保存成功');
  } catch (error) {
    console.error('保存地址失败:', error);
    ElMessage.error('保存失败');
  }
};

// 获取收藏列表
const fetchFavorites = async () => {
  try {
    if (!userStore.userInfo?.id)
      return;
    const res = await request.get('/favorites', {
      params: { userId: userStore.userInfo.id }
    });
    // 对每个收藏项获取商品详情
    const favoritesWithDetails = await Promise.all(
      res.map(async (fav) => {
        const products = await request.get('/products', {
          params: { id: fav.productId }
        });
        return {
          ...fav,
          product: Array.isArray(products) && products.length > 0 ? products[0] : null
        };
      })
    );
    // 过滤掉没有商品详情的收藏项
    favorites.value = favoritesWithDetails.filter(fav => fav.product);
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    ElMessage.error('获取收藏列表失败');
  }
};

// 取消收藏
const removeFavorite = async (id) => {
  try {
    await request.delete(`/favorites/${id}`);
    await fetchFavorites();
    ElMessage.success('取消收藏成功');
  } catch (error) {
    console.error('取消收藏失败:', error);
    ElMessage.error('取消收藏失败');
  }
};

// 跳转到商品详情
const goToProduct = (productId) => {
  router.push(`/products/${productId}`);
};

// 编辑模式切换
watch(editMode, (newValue) => {
  if (newValue) {
    // 进入编辑模式时，初始化表单数据
    userForm.value = {
      username: userStore.userInfo?.username || '',
      phone: userStore.userInfo?.phone || '',
      email: userStore.userInfo?.email || ''
    };
  } else {
    // 退出编辑模式时，保存数据
    saveUserInfo();
  }
});

// 保存用户信息
const saveUserInfo = async () => {
  try {
    if (!userStore.userInfo?.id) return;

    await userStore.updateProfile({
      ...userStore.userInfo,
      ...userForm.value
    });

    editMode.value = false;
    ElMessage.success('保存成功');
  } catch (error) {
    console.error('保存用户信息失败:', error);
    ElMessage.error('保存失败');
    editMode.value = true; // 保持编辑模式
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

// 修改密码逻辑
const handleChangePwd = async () => {
  await pwdFormRef.value.validate();
  if (pwdForm.value.oldPwd !== userStore.userInfo.password) {
    ElMessage.error('原密码输入错误');
    return;
  }
  if (pwdForm.value.newPwd === pwdForm.value.oldPwd) {
    ElMessage.error('新密码不能与原密码相同');
    return;
  }
  try {
    await userStore.updateProfile({ ...userStore.userInfo, password: pwdForm.value.newPwd });
    ElMessage.success('密码修改成功');
    showPwdDialog.value = false;
    pwdForm.value = { oldPwd: '', newPwd: '', confirmPwd: '' };
  } catch (err) {
    ElMessage.error('密码修改失败', err.message);
  }
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
  let phone = phoneForm.value.newPhone;
  if (Array.isArray(phone)) {
    phone = phone[0];
  }
  try {
    await userStore.updateProfile({ ...userStore.userInfo, phone });
    ElMessage.success('手机号修改成功');
    showPhoneDialog.value = false;
    phoneForm.value = { newPhone: '' };
  } catch (err) {
    ElMessage.error('手机号修改失败', err.message);
  }
};

// 退出登录
const logout = async () => {
  await userStore.logout();
  router.push('/login');
};

// 头像上传处理
const handleAvatarChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // 只允许图片
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }
  // 转base64
  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    try {
      await userStore.updateProfile({ ...userStore.userInfo, avatar: base64 });
      ElMessage.success('头像更新成功');
    } catch (err) {
      ElMessage.error('头像更新失败', err.message);
    }
  };
  reader.readAsDataURL(file);
};

// 初始化数据
const initData = async () => {
  if (userStore.isLogin && userStore.userInfo) {
    if (!dataLoaded.value) {
      await Promise.all([
        fetchAddresses(),
        fetchFavorites()
      ]);
      dataLoaded.value = true;
    }
  }
};

onMounted(async () => {
  await initData();
});

// keep-alive 生命周期钩子
onActivated(() => {
  console.log('ProfileView 被激活');
  // 每次激活时刷新用户数据
  if (userStore.isLogin && userStore.userInfo) {
    fetchAddresses();
    fetchFavorites();
  }
});

onDeactivated(() => {
  console.log('ProfileView 被停用');
  // 可以在这里保存一些状态
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
