<template>
  <!--
    全站通用页脚
    作用：复用首页页脚内容，保证所有页面风格统一
  -->
  <footer class="footer">
    <div class="footer-content">
      <!-- 关于系统 -->
      <div class="footer-section about">
        <h3>关于系统</h3>
        <p>教室预约系统是一个面向师生的在线教室资源管理平台，支持教室查询、在线预约、审批管理等功能，让教室资源分配更加高效便捷。</p>
      </div>

      <!-- 快速链接 -->
      <div class="footer-section links">
        <h3>快速链接</h3>
        <ul>
          <li>
            <RouterLink to="/">首页</RouterLink>
          </li>
          <li>
            <RouterLink to="/classrooms">教室查询</RouterLink>
          </li>
          <li>
            <RouterLink to="/my-reservations">我的预约</RouterLink>
          </li>
          <li>
            <RouterLink to="/notice">系统公告</RouterLink>
          </li>
        </ul>
      </div>

      <!-- 联系方式 -->
      <div class="footer-section contact">
        <h3>联系我们</h3>
        <p><el-icon>
            <Phone />
          </el-icon> 教务处：0571-12345678</p>
        <p><el-icon>
            <Message />
          </el-icon> jwc@school.edu.cn</p>
        <p><el-icon>
            <Location />
          </el-icon> 行政楼 201 室</p>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; 2026 教室预约系统 v1.0 | 技术支持：信息中心</p>
    </div>
  </footer>
</template>

<script setup>
/**
 * AppFooter
 * - 复用首页的页脚结构
 * - 放在 Layout 中，所有页面共用
 */
import { RouterLink } from 'vue-router'
import { Phone, Message, Location } from '@element-plus/icons-vue'
</script>

<style scoped>
/* ==================== 页脚样式 ==================== */
.footer {
  background-color: #2c3e50;
  color: #fff;
  margin-top: 0;
  padding: 40px 0 0;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  text-align: left;
}

.footer-section h3 {
  font-size: 16px;
  margin-bottom: 20px;
  position: relative;
  padding-bottom: 10px;
}

.footer-section h3::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 30px;
  height: 2px;
  background-color: #2ecc71;
}

.footer-section p {
  font-size: 14px;
  color: #b0b0b0;
  line-height: 1.8;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-section.about p {
  display: block;
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section ul li {
  margin-bottom: 10px;
}

.footer-section ul li a {
  color: #b0b0b0;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.footer-section ul li a:hover {
  color: #2ecc71;
}

.footer-bottom {
  text-align: center;
  padding: 20px;
  margin-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-bottom p {
  font-size: 13px;
  color: #888;
  margin: 0;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 992px) {
  .footer-content {
    grid-template-columns: 1fr;
  }

  .footer-section h3::after {
    left: 0;
    transform: none;
  }

  .footer-section p {
    justify-content: flex-start;
  }
}
</style>
