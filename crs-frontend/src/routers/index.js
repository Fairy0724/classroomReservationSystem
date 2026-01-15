import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

const pinia = createPinia()
// const userStore = useUserStore(pinia)

const routes = [
  {
    path: '/test',
    component: () => import('@/views/Test.vue') // 使用@别名导入
  }
]
// 使用history模式（无#号URL，无页面刷新）
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Vite环境变量写法
  routes
})

// 路由拦截逻辑与之前一致
// router.beforeEach((to, from, next) => {
//   if (to.meta.requiresAuth) {
//     if (!localStorage.getItem('token')) next('/login')
//     else if (to.meta.isAdmin && userStore.role !== 'admin') next('/classroom')
//     else next()
//   } else next()
// })

export default router