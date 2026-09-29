import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vue-tel-input/dist/vue-tel-input.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import './assets/css/main.css'

import App from './App.vue'
import api from './api'
import { notifySuccess, notifyError, deleteModal } from './helpers/swalNotifier'
import Filters from './helpers/filters'
import { setupValidation } from './helpers/validation'
import router from './router'
import VueTelInput from 'vue-tel-input'
import { useAuthStore } from './stores'
import { setupRouterGuard } from './router/guards'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(VueTelInput)
setupValidation()

/**
 * Registers the centralized API layer as a global property
 * so components can access it through `this.$api.*`.
 */
app.config.globalProperties.$api = api
/**
 * Registers the global formatter helpers so any component can call `this.$filters.xxx`.
 */
app.config.globalProperties.$filters = Filters
/**
 * Registers a global helper for showing themed success notifications.
 * @param {string} message - The message to display in the notification.
 */
app.config.globalProperties.$notifySuccess = notifySuccess
/**
 * Registers a global helper for showing themed error notifications.
 * @param {string} message - The message to display in the notification.
 */
app.config.globalProperties.$notifyError = notifyError
app.config.globalProperties.$deleteModal = deleteModal
/**
 * Initializes authentication state before starting the router.
 *
 * Authentication is restored before the router is installed so that the
 * initial navigation has access to the restored authentication state.
 * The router guard is then registered and the router waits for its initial
 * navigation to complete before the application is mounted.
 */
const authStore = useAuthStore(pinia)
await authStore.initializeAuth()

setupRouterGuard(router, pinia)
app.use(router)
await router.isReady()

app.mount('#app')
