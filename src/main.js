import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/styles.css'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'

const app = createApp(App)
app.use(createPinia())
app.use(router)
useThemeStore().init()
useAuthStore().init()
app.mount('#app')
