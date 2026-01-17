import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
// 获取用户状态存储
import { useUserStore } from '@/stores/userStore'
const pinia = createPinia()
const userStore = useUserStore(pinia)

// 懒加载页面
const LoginView = () => import('@/views/LoginView.vue')
const MainView = () => import('@/views/MainView.vue')
const Layout = () => import('@/components/Layout.vue')
const HomeView = () => import('@/views/HomeView.vue')
const AdminView = () => import('@/views/AdminView.vue')


const routes = [
  {
    path: '/',
    component: Layout,
    children: [
      {
        // 首页路由，默认跳转到home
        path: '',
        name: 'home',
        component: HomeView,
        meta: { keepAlive: true } // 首页需要缓存
      },
      {
        // 管理员路由，默认跳转到admin
        path: '/admin',
        name: 'admin',
        component: AdminView,
        meta: { keepAlive: true, isAdmin: true } // 管理员页需要缓存
      }
    ]
    
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { keepAlive: false } // 登录页不需要缓存
  }
]
// 使用history模式（无#号URL，无页面刷新）
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Vite环境变量写法
  routes
})

// 路由拦截逻辑与之前一致
router.beforeEach((to, from, next) => {
  // 检查当前路由是否需要登录权限
  if (to.meta.requiresAuth) {
    // 检查是否有 token
    if (!localStorage.getItem('token')) {
      next('/login'); // 无 token 跳转到登录页
    }
    // 检查是否需要管理员权限（仅当路由要求且用户不是管理员时拦截）
    else if (to.meta.isAdmin && userStore.role !== 'admin') {
      next('/'); // 非管理员跳转到首页
    }
    // 有权限，正常放行
    else {
      next();
    }
  }
  // 不需要权限的路由，直接放行
  else {
    next();
  }
});

export default router