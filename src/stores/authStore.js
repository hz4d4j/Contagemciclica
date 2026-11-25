import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isCatalystMode, apiBaseUrl } from '../lib/appMode'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  async function init() {
    if (!isCatalystMode) {
      user.value = { name: 'Bolt Preview', source: 'bolt' }
      return
    }
    // In Catalyst with Easy Auth, the platform handles login.
    // We call a protected API endpoint to confirm the session is authenticated.
    // If not authenticated, Easy Auth redirects to Microsoft login automatically.
    loading.value = true
    try {
      const res = await fetch(`${apiBaseUrl}/api/costs`, { credentials: 'include' })
      if (res.ok) {
        user.value = { name: 'Usuário autenticado', source: 'easy-auth' }
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  function login() {
    if (isCatalystMode) {
      // Easy Auth redirect: App Service handles the flow
      window.location.href = `${apiBaseUrl}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.href)}`
    }
  }

  function logout() {
    if (isCatalystMode) {
      window.location.href = `${apiBaseUrl}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`
    }
  }

  return { user, loading, isAuthenticated, init, login, logout }
})
