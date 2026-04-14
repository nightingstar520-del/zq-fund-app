import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import router from './router'

// 路由稍后配置
const app = createApp(App)
app.use(createPinia())
app.use(Vant)
app.use(router)
app.mount('#app')