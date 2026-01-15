import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Vite环境变量写法
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
    ElMessage.error(err.response?.data?.msg || '请求失败')
    return Promise.reject(err)
  }
)

export default service