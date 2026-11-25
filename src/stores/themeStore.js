import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'contagem-theme'

export const useThemeStore = defineStore('theme', () => {
  const dark = ref(true)

  function apply() {
    document.documentElement.setAttribute('data-bs-theme', dark.value ? 'dark' : 'light')
  }

  function init() {
    dark.value = localStorage.getItem(STORAGE_KEY) !== 'light'
    apply()
  }

  function toggle() {
    dark.value = !dark.value
  }

  watch(dark, (value) => {
    localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
    apply()
  })

  return { dark, init, toggle }
})
