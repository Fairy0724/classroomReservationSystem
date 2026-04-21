<template>
  <div class="login-page">
    <!-- 顶部导航栏，包含logo和返回首页链接，带有阴影效果 -->
    <header class="header">
      <div class="container">
        <div class="logo-wrapper">
          <span class="brand-text">教室预约系统</span>
        </div>
        <a href="/" class="go-home">
          <span>进入教室预约系统首页</span>
          <i class="fa fa-angle-right"></i>
        </a>
      </div>
    </header>

    <!-- 主要内容区，使用淡绿色渐变背景 -->
    <main class="main-content">
      <div class="container">
        <div class="login-container">
          <!-- 左侧Banner区域，展示信息，使用渐变背景 -->
          <div class="banner-section">
            <div class="banner-content">
              <h2 class="title">智能教室预约系统</h2>
              <p class="summer-text">CLASSROOM</p>
              <p class="description">便捷高效的教室预约管理平台，轻松查看教室信息，快速完成预约申请，让您的学习与教学更加有序高效！</p>
              <div class="cta-buttons">
                <button class="btn btn-primary">
                  <i class="fa fa-book"></i> 查看教室
                </button>
                <button class="btn btn-secondary">
                  <i class="fa fa-calendar"></i> 高效预约
                </button>
              </div>
            </div>
            <!-- 装饰元素，圆形图案 -->
            <div class="decorations">
              <div class="circle circle-large"></div>
              <div class="circle circle-medium"></div>
              <div class="circle circle-small"></div>
            </div>
          </div>

          <!-- 右侧登录框，白色背景，包含表单和其他登录方式 -->
          <div class="login-section">
            <div class="login-box">
              <div class="login-header">
                <h3 class="login-title">账户登录</h3>
                <p class="login-subtitle">欢迎回来，请登录您的账户</p>
              </div>

              <form class="login-form">
                <div class="form-group">
                  <label for="account" class="form-label">学号/工号</label>
                  <div class="input-wrapper">
                    <!-- 替换后 -->
                    <el-icon class="input-icon">
                      <User />
                    </el-icon>

                    <input type="text" id="account" v-model="account" placeholder="请输入学号/工号" class="form-input">
                  </div>
                </div>

                <div class="form-group">
                  <label for="password" class="form-label">密码</label>
                  <div class="input-wrapper">
                    <el-icon class="input-icon">
                      <Lock />
                    </el-icon>
                    <!-- 密码输入框默认隐藏，可通过右侧眼睛按钮切换显示/隐藏 -->
                    <input :type="isPasswordVisible ? 'text' : 'password'" id="password" v-model="password"
                      placeholder="请输入密码" class="form-input form-input--with-action">
                    <!-- 眼睛图标：点击切换密码显示状态 -->
                    <button type="button" class="toggle-password" @click="togglePassword"
                      :aria-label="isPasswordVisible ? '隐藏密码' : '显示密码'">
                      <el-icon>
                        <View v-if="!isPasswordVisible" />
                        <Hide v-else />
                      </el-icon>
                    </button>
                  </div>
                </div>

                <div class="agreement">
                  <input type="checkbox" id="agree" v-model="isAgree" class="form-checkbox">
                  <label for="agree" class="form-label">
                    我已同意<a href="#" class="link">隐私条款</a>和<a href="#" class="link">服务条款</a>
                  </label>
                </div>

                <button type="button" class="login-button" @click="handleLogin">
                  点击登录
                </button>
              </form>


            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部信息，包含公司信息、链接和联系方式 -->
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-logo">
            <p class="slogan">智能·便捷·高效</p>
          </div>

          <div class="footer-links">
            <div class="footer-col">
              <h4 class="footer-title">关于系统</h4>
              <ul class="footer-list">
                <li><a href="#" class="footer-link">系统介绍</a></li>
                <li><a href="#" class="footer-link">使用说明</a></li>
                <li><a href="#" class="footer-link">联系我们</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4 class="footer-title">使用帮助</h4>
              <ul class="footer-list">
                <li><a href="#" class="footer-link">预约指南</a></li>
                <li><a href="#" class="footer-link">常见问题</a></li>
                <li><a href="#" class="footer-link">操作手册</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4 class="footer-title">功能特色</h4>
              <ul class="footer-list">
                <li><a href="#" class="footer-link">在线预约</a></li>
                <li><a href="#" class="footer-link">教室查询</a></li>
                <li><a href="#" class="footer-link">预约管理</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4 class="footer-title">联系我们</h4>
              <div class="social-media">
                <a href="#" class="social-icon weixin">
                  <i class="fa fa-weixin"></i>
                  <!-- <el-icon class="social-icon"><Wechat /></el-icon> -->
                </a>
                <a href="#" class="social-icon weibo">
                  <i class="fa fa-weibo"></i>
                </a>
                <a href="#" class="social-icon email">
                  <i class="fa fa-envelope"></i>
                </a>
              </div>
              <p class="contact">技术支持：admin@crs.edu.cn</p>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="copyright">CopyRight © 2026 教室预约系统. 保留所有权利.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/userStore';
import { User, Lock, View, Hide } from '@element-plus/icons-vue'

// 引入用户状态管理和路由
const userStore = useUserStore();
const router = useRouter();

// 定义表单数据响应式变量
const account = ref('');       // 登录账户
const password = ref('');      // 登录密码
const isAgree = ref(false);    // 协议同意状态
const isPasswordVisible = ref(false); // 控制密码是否显示

// 切换密码显示/隐藏
const togglePassword = () => {
  isPasswordVisible.value = !isPasswordVisible.value;
};

// 统一提示入口，便于后续替换为更复杂的提示组件
const showMessage = (message) => {
  ElMessage({ message, type: 'warning', duration: 2000 });
};

// 登录处理函数
const handleLogin = async () => {
  // A-3：学号/工号为空
  if (!account.value) {
    showMessage('请输入学号/工号');
    return;
  }

  // A-4：密码为空
  if (!password.value) {
    showMessage('请输入密码');
    return;
  }

  // A-5：未勾选协议
  if (!isAgree.value) {
    showMessage('请先同意隐私条款和服务条款');
    return;
  }

  try {
    // 调用用户存储中的登录方法
    await userStore.login(account.value, password.value);
    // 获取登录前的页面路径并跳转
    // const redirect = router.currentRoute.value.query.redirect || '/';
    // router.push(redirect);
    // 判断用户角色，跳转到不同页面
    // 输出用户角色
    console.log('用户角色:', userStore.role === 'admin' ? '管理员' : '普通用户');
    if (userStore.role === 'admin') {
      router.push('/admin');
      console.log(userStore.role)
    } else {
      router.push('/');
    }
  } catch (error) {
    console.error('登录失败:', error);

    // A-3/A-7：根据后端返回文案进行提示（账号错误/密码错误/临时锁定）
    const backendMessage = error?.response?.data?.msg;
    if (backendMessage) {
      showMessage(backendMessage);
      return;
    }

    // 兜底提示
    showMessage('登录失败，请检查账户和密码或联系管理员');
  }
};
</script>

<style scoped>
/* 全局样式变量定义 */
:root {
  --primary-color: #00b38a;
  /* 主色调：绿色 */
  --primary-dark: #009974;
  /* 主色调深色 */
  --secondary-color: #87e8de;
  /* 辅助色：浅绿色 */
  --text-color: #333;
  /* 文本主色 */
  --text-light: #666;
  /* 文本浅色 */
  --text-lighter: #999;
  /* 文本更浅色 */
  --bg-light: #f8f9fa;
  /* 背景浅色 */
  --bg-gray: #e9ecef;
  /* 背景灰色 */
  --border-radius: 8px;
  /* 边框圆角 */
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  /* 盒子阴影 */
}

/* 基础样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
}

a {
  text-decoration: none;
  color: inherit;
}

ul {
  list-style: none;
}

/* 使用新的容器类 */
.container {
  width: 100%;
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 0 var(--page-padding);
  box-sizing: border-box;
}

/* 头部导航样式 */
.header {
  background-color: white;
  box-shadow: var(--box-shadow);
  padding: 0;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 100px;
  padding: 16px 20px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
}

/* 登录页品牌文字，风格与用户端导航一致 */
.brand-text {
  font-size: 24px;
  font-weight: 600;
  color: #22c55e;
  letter-spacing: 0;
  line-height: normal;
}

.logo {
  width: 70px;
  height: 60px;
  border-radius: 8px;
  margin-right: 10px;
}

.brand-name {
  font-size: 18px;
  font-weight: bold;
  color: var(--primary-color);
}

.go-home {
  color: var(--primary-color);
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.go-home:hover {
  color: var(--primary-dark);
  transform: translateX(2px);
}

.go-home i {
  margin-left: 5px;
}

/* 主要内容区样式 */
.main-content {
  padding: 60px 0;
  background: linear-gradient(135deg, #e5f6e5 0%, #d1f0d1 100%);
}

.login-container {
  display: flex;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--box-shadow);
}

/* 左侧Banner区域样式 */
.banner-section {
  flex: 1;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
  padding: 60px;
  position: relative;
  overflow: hidden;
}

.banner-content {
  position: relative;
  z-index: 10;
}

.title {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 20px;
}

.summer-text {
  font-size: 60px;
  font-weight: 900;
  margin-bottom: 30px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.description {
  font-size: 16px;
  margin-bottom: 40px;
  max-width: 300px;
}

.cta-buttons {
  display: flex;
  gap: 20px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.btn-primary {
  background-color: white;
  color: var(--primary-color);
  border: none;
}

.btn-primary:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background-color: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn i {
  margin-right: 8px;
}

.decorations {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
}

.circle-large {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.circle-medium {
  width: 200px;
  height: 200px;
  top: 200px;
  right: -50px;
}

.circle-small {
  width: 100px;
  height: 100px;
  bottom: 100px;
  right: 100px;
}

/* 右侧登录框样式 */
.login-section {
  flex: 1;
  background-color: white;
  padding: 60px;
  display: flex;
  justify-content: center;
}

.login-box {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

.login-subtitle {
  color: var(--text-light);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-lighter);
}

.form-input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
}

/* 右侧有操作按钮的输入框预留空间 */
.form-input--with-action {
  padding-right: 44px;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 179, 138, 0.2);
}

/* 眼睛按钮样式 */
.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-lighter);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.toggle-password:hover {
  color: var(--primary-color);
}

.toggle-password:focus-visible {
  outline: 2px solid rgba(0, 179, 138, 0.35);
  outline-offset: 2px;
  border-radius: 4px;
}

.agreement {
  display: flex;
  align-items: center;
  margin: 10px 0;
}

.form-checkbox {
  margin-right: 10px;
}

.link {
  color: var(--primary-color);
  text-decoration: none;
  transition: all 0.3s ease;
}

.link:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.login-button {
  width: 100%;
  padding: 14px;
  background-color: #00b38a;
  color: white;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-button:hover {
  background-color: #009974;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 179, 138, 0.2);
}

/* 注册链接样式 */
.register-link {
  text-align: center;
  font-size: 14px;
  margin-top: 20px;
}

/* 底部信息样式 */
.footer {
  background-color: white;
  padding: 60px 0;
  border-top: 1px solid #eee;
}

.footer-top {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.footer-logo {
  flex: 1;
  margin-right: 40px;
  min-width: 200px;
}

.footer-logo img {
  width: 90px;
  height: 80px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.footer-logo .slogan {
  font-size: 24px;
  color: var(--text-light);
}

.footer-links {
  flex: 3;
  display: flex;
  flex-wrap: wrap;
}

.footer-col {
  flex: 1;
  min-width: 150px;
  margin-bottom: 20px;
}

.footer-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
}

.footer-list {
  font-size: 14px;
  color: var(--text-light);
}

.footer-list li {
  margin-bottom: 10px;
}

.social-media {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.social-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.social-icon:hover {
  background-color: var(--primary-color);
  color: white;
}

.contact {
  font-size: 14px;
  color: var(--text-light);
}

.footer-bottom {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: var(--text-lighter);
}

/* 响应式设计 */
@media (max-width: 992px) {
  .login-container {
    flex-direction: column;
  }

  .banner-section,
  .login-section {
    padding: 40px;
  }

  .summer-text {
    font-size: 40px;
  }

  .footer-top {
    flex-direction: column;
  }

  .footer-logo {
    margin-bottom: 40px;
  }
}

@media (max-width: 576px) {

  .banner-section,
  .login-section {
    padding: 30px;
  }

  .title {
    font-size: 24px;
  }

  .summer-text {
    font-size: 30px;
  }

  .description {
    font-size: 14px;
  }

  .btn {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>