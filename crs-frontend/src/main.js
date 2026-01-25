import { createApp } from 'vue'
import pinia from './stores/pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './routes'

import './style.css'
import App from './App.vue'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')