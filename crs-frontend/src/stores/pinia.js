import { createPinia } from 'pinia'

// 统一 Pinia 实例，保证 Router Guard 与 App 共用同一个 Store
const pinia = createPinia()

export default pinia
