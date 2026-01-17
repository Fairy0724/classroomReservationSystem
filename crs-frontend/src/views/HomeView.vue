<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <nav class="nav-container">
      <div class="nav-wrapper">
        <div class="logo">
          <img src="../assets/images/logo.png" alt="荔枝烧蓝莓 Logo">
        </div>
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="搜索教室..." @keyup.enter="handleSearch">
          <button class="search-btn" @click="handleSearch">
            <i class="fa fa-search"></i>
          </button>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <template v-if="userStore.isLogin">
            <!-- <RouterLink to="/profile" class="nav-link">个人中心</RouterLink> -->
            <!-- <RouterLink :to="{ name: 'cart' }" class="nav-link cart-link">购物车</RouterLink> -->
            <!-- <RouterLink :to="{ name: 'orders' }" class="nav-link">订单</RouterLink> -->
            <a href="#" class="nav-link" @click.prevent="logout">退出登录</a>
          </template>
          <template v-else>
            <RouterLink to="/login" class="nav-link">登录</RouterLink>
          </template>
        </div>
      </div>
    </nav>

    <!-- 轮播图 -->
    <!-- <div class="hero-section"> -->
    <!-- <div class="hero-slider">
      <div v-for="(slide, index) in slides" :key="slide.id" :class="['slide', { active: currentSlide === index }]">
        <img :src="slide.imageUrl" :alt="slide.title">
        <div class="slide-content">
          <h1>{{ slide.title }}</h1>
          <p>{{ slide.description }}</p>
          <a :href="slide.link" class="btn">{{ slide.buttonText || '立即查看' }}</a>
        </div>
      </div>
    </div>
    </div> -->

    <!-- 商品和分类区域 -->
    <!-- <div class="products-section"> -->
    <div class="section-wrapper">
      <h2 class="section-title">分类</h2>
      <div class="category-tabs">
        <div class="tab-item" :class="{ active: !selectedCategory }" @click="selectCategory(null)">
          全部教室
        </div>
        <div v-for="category in categories" :key="category.id" class="tab-item"
          :class="{ active: selectedCategory === category.id }" @click="selectCategory(category.id)">
          {{ category.name }}
        </div>
      </div>

      <div v-if="selectedCategory" class="current-category">
        当前分类：{{ getCategoryName(selectedCategory) }}
        <span class="clear-category" @click="clearCategory">×</span>
      </div>

      <div class="product-grid">
        <div v-if="currentPageProducts.length === 0" class="no-products">
          该分类暂无教室
        </div>
        <div v-else v-for="product in currentPageProducts" :key="product.id" class="product-card"
          @click="goToDetail(product.id)">
          <div class="product-image">
            <img :src="product.mainImage || `https://picsum.photos/seed/product${product.id}/400/400`"
              :alt="product.name">
            <div class="discount-badge" v-if="product.discount">{{ product.discount }}折</div>
            <button class="quick-view-btn">
              <i class="fa fa-eye"></i> 快速查看
            </button>
          </div>
          <div class="product-info">
            <div class="brand">{{ product.brandName }}</div>
            <h3>{{ product.name }}</h3>
            <div class="price">
              <span class="current-price">¥{{ product.price }}</span>
              <span class="original-price" v-if="product.originalPrice">¥{{ product.originalPrice }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 分页组件 -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <!-- 显示页码按钮 -->
        <button v-for="page in getVisiblePages" :key="page" :class="{ active: page === currentPage }"
          @click="goToPage(page)">
          {{ page }}
        </button>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
    </div>
    <!-- </div> -->

    <!-- 品牌展示 -->
    <div class="brand-section">
      <h2 class="section-title">知名品牌</h2>
      <div class="brands">
        <div class="brand-item" v-for="brand in brands" :key="brand.id" @click="goToBrand(brand)">
          <img :src="brand.logoUrl" :alt="brand.name">
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section about">
          <h3>关于我们</h3>
          <p>教室预约系统是一个专注于教室预约的在线平台，致力于为您提供方便的教室预约服务。</p>
        </div>
        <div class="footer-section links">
          <h3>快速链接</h3>
          <ul>
            <li><a href="/">首页</a></li>
            <li><a href="#">商品分类</a></li>
            <li><a href="#">特惠活动</a></li>
            <li><a href="#">关于我们</a></li>
            <li><a href="#">联系我们</a></li>
          </ul>
        </div>
        <div class="footer-section contact">
          <h3>联系我们</h3>
          <p><i class="fa fa-phone"></i> 400-123-4567</p>
          <p><i class="fa fa-envelope"></i> support@lizhi.com</p>
          <div class="socials">
            <a href="#"><i class="fa fa-weixin"></i></a>
            <a href="#"><i class="fa fa-weibo"></i></a>
            <a href="#"><i class="fa fa-instagram"></i></a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 教室预约系统. 保留所有权利.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onActivated, onDeactivated } from 'vue';
import request from '../utils/request';
import { useRouter, RouterLink } from 'vue-router';
import { useUserStore } from '../stores/userStore';

const router = useRouter();
const userStore = useUserStore();
const cartCount = ref(0);
const searchQuery = ref('');

// 当前页码
const currentPage = ref(1);
// 每页显示的商品数量
const itemsPerPage = 8;

const products = ref([]);
const categories = ref([]);
const brands = ref([]);
const slides = ref([]);

const currentSlide = ref(0);
let intervalId;

// 分类相关
const selectedCategory = ref(null);

// 数据是否已加载的标志
const dataLoaded = ref(false);

// 计算总页数
const totalPages = computed(() => {
  const filtered = selectedCategory.value ? products.value.filter(product => Number(product.categoryId) === Number(selectedCategory.value)) : products.value;
  return Math.ceil(filtered.length / itemsPerPage);
});

// 根据当前页码获取要显示的商品
// const currentPageProducts = computed(() => {
//   const filtered = selectedCategory.value ? products.value.filter(product => Number(product.categoryId) === Number(selectedCategory.value)) : products.value;
//   const startIndex = (currentPage.value - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   return filtered.slice(startIndex, endIndex);
// });

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// 下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// 跳转到指定页码
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// // 获取可见的页码数组，限制在5页
// const getVisiblePages = computed(() => {
//   const visiblePages = [];
//   const startPage = Math.max(currentPage.value - 2, 1);
//   const endPage = Math.min(startPage + 4, totalPages.value);

//   for (let i = startPage; i <= endPage; i++) {
//     visiblePages.push(i);
//   }

//   return visiblePages;
// });

// // 获取购物车数量
// const fetchCartCount = async () => {
//   if (!userStore.isLogin) {
//     cartCount.value = 0;
//     return;
//   }

//   try {
//     // 检查用户是否登录
//     if (userStore.userInfo && userStore.userInfo.id) {
//       const res = await request.get('/carts', {
//         params: { userId: userStore.userInfo.id }
//       });
//       cartCount.value = Array.isArray(res) ? res.length : 0;
//     } else {
//       cartCount.value = 0;
//     }
//   } catch (error) {
//     console.error('获取购物车数量失败:', error);
//     cartCount.value = 0;
//   }
// };

// 退出登录
const logout = async () => {
  await userStore.logout();
  router.push('/login');
};

// 搜索处理
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: 'select',
      query: { q: searchQuery.value }
    });
  }
};

// // 获取轮播图数据
// const fetchBanners = async () => {
//   try {
//     const res = await request.get('/banners');
//     slides.value = res;
//   } catch (error) {
//     console.error('获取轮播图数据失败:', error);
//   }
// };

// // 获取分类数据
// const fetchCategories = async () => {
//   try {
//     const res = await request.get('/categories');
//     categories.value = res;
//   } catch (error) {
//     console.error('获取分类数据失败:', error);
//   }
// };

// // 获取商品数据
// const fetchProducts = async () => {
//   try {
//     const res = await request.get('/products');
//     products.value = res;
//   } catch (error) {
//     console.error('获取商品列表失败:', error);
//   }
// };

// // 获取品牌数据
// const fetchBrands = async () => {
//   try {
//     const res = await request.get('/brands');
//     brands.value = res;
//   } catch (error) {
//     console.error('获取品牌数据失败:', error);
//   }
// };

// 切换到下一张幻灯片
const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % slides.value.length;
};

// 跳到详情页
const goToDetail = (productId) => {
  router.push({
    name: 'productDetail',
    params: { id: productId }
  });
};

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId);
  return category ? category.name : '';
};

// 选择分类
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId;
  currentPage.value = 1; // 切换分类时重置页码
};

// 清除分类
const clearCategory = () => {
  selectedCategory.value = null;
  currentPage.value = 1; // 清除分类时重置页码
};

// 跳转到品牌页
const goToBrand = (brand) => {
  router.push({
    name: 'brandsView',
    query: { brandId: brand.id, brandName: brand.name }
  });
};

// 初始化数据
const initData = async () => {
  if (!dataLoaded.value) {
    await Promise.all([
      fetchBanners(),
      fetchCategories(),
      fetchProducts(),
      fetchBrands()
    ]);
    dataLoaded.value = true;
  }

  // 获取购物车数量
  if (userStore.isLogin) {
    fetchCartCount();
  }
};

onMounted(async () => {
  await initData();
  intervalId = setInterval(nextSlide, 5000);

  // 监听登录状态变化
  watch(() => userStore.isLogin, (isLogin) => {
    if (isLogin) {
      fetchCartCount();
    } else {
      cartCount.value = 0;
    }
  });
});

onUnmounted(() => {
  clearInterval(intervalId);
});

// keep-alive 生命周期钩子
onActivated(() => {
  console.log('HomeView 被激活');
  // 重新启动轮播图定时器
  intervalId = setInterval(nextSlide, 5000);
  // 刷新购物车数量
  if (userStore.isLogin) {
    fetchCartCount();
  }
});

onDeactivated(() => {
  console.log('HomeView 被停用');
  // 清除轮播图定时器
  clearInterval(intervalId);
});
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  margin: 0 5px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button.active {
  background-color: #2ecc71;
  color: white;
}

.pagination span {
  margin: 0 10px;
}

/* 其他样式保持不变 */
/* 全局样式 */
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

/* 导航栏 */
.nav-container {
  background-color: white;
  box-shadow: const(--box-shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.search-bar {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 999px;
  overflow: hidden;
  padding: 0.5rem 1rem;
  width: 400px;
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.5rem;
}

.search-btn {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 0.5rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-color);
  transition: color 0.3s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--primary-color);
}

.cart-link {
  position: relative;
}

.cart-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: var(--secondary-color);
  color: white;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.75rem;
}

/* 英雄区域 */
.hero-section {
  position: relative;
  height: 900px;
  overflow: hidden;
}

.hero-slider {
  position: relative;
  height: 100%;
}

.slide {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.slide.active {
  opacity: 1;
}

.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-content {
  position: absolute;
  top: 50%;
  left: 10%;
  transform: translateY(-50%);
  color: white;
  max-width: 500px;
}

.slide-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slide-content p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.btn {
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* 商品和分类区域 */
.products-section {
  padding: 4rem 2rem;
  background-color: var(--bg-light);
}

.section-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* 标题样式 */
.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
  position: relative;
  margin-bottom: 30px;
  padding: 0;
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

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 20px 0;
  justify-content: center;
}

.tab-item {
  padding: 8px 20px;
  border-radius: 20px;
  background-color: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.tab-item:hover {
  background-color: #e0f2e9;
  color: var(--primary-color);
}

.tab-item.active {
  background-color: var(--primary-color);
  color: white;
}

/* 当前分类标签 */
.current-category {
  display: inline-flex;
  align-items: center;
  margin: 0 0 20px;
  padding: 6px 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: var(--primary-color);
  font-size: 14px;
}

.clear-category {
  margin-left: 8px;
  cursor: pointer;
  color: #999;
  transition: color 0.3s ease;
}

.clear-category:hover {
  color: #ff4444;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

/* 无商品提示 */
.no-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

/* 商品区域 */
.product-grid {
  display: grid;
  /* 修改为一行显示四个商品 */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.product-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  overflow: hidden;
  cursor: pointer;
  /* 添加手型光标 */
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
  background-color: var(--secondary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 10;
}

.quick-view-btn {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--text-color);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: pointer;
  z-index: 20;
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
  padding: 1.5rem;
}

.brand {
  font-size: 0.875rem;
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.product-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  line-height: 1.4;
  height: 3.36rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.price {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.current-price {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.original-price {
  font-size: 0.875rem;
  color: var(--text-light);
  text-decoration: line-through;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.add-to-cart-btn {
  flex: 1;
  background-color: var(--primary-color);
  color: white;
  padding: 0.75rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.add-to-cart-btn:hover {
  background-color: var(--primary-dark);
}

.favorite-btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  transition: all 0.3s ease;
  cursor: pointer;
}

.favorite-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* 品牌区域 */
.brand-section {
  padding: 4rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.brands {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 2rem;
}

.brand-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  transition: all 0.3s ease;
  cursor: pointer;
}

.brand-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.brand-item img {
  max-width: 100%;
  max-height: 60px;
  object-fit: contain;
}

/* 页脚 */
.footer {
  background-color: #2c3e50;
  color: white;
  padding: 4rem 2rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 4rem;
}

.footer-section {
  padding: 1rem;
}

.footer-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  position: relative;
}

.footer-section h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 40px;
  height: 2px;
  background-color: var(--primary-color);
}

.footer-section p {
  margin-bottom: 1rem;
}

.footer-section ul li {
  margin-bottom: 0.75rem;
}

.footer-section ul li a {
  transition: color 0.3s ease;
}

.footer-section ul li a:hover {
  color: var(--primary-color);
}

.socials {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.socials a {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.socials a:hover {
  background-color: var(--primary-color);
}

.footer-bottom {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
