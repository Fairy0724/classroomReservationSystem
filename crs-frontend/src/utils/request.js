import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  // 优先使用环境变量，未配置时回退到 /api（走 Vite 代理）
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000
})

// 请求/响应拦截逻辑
service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器
service.interceptors.response.use(
  res => res.data,
  err => {
    // 登录页会自行处理提示，避免重复弹窗
    const requestUrl = err.config?.url || ''
    if (!requestUrl.includes('/user/login')) {
      ElMessage.error(err.response?.data?.msg || '请求失败')
    }
    return Promise.reject(err)
  }
)

export default service