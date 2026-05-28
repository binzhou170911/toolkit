import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage, setStorage } from '../lib/storage'
import { getCurrentWindow } from '@tauri-apps/api/window'

export const useAppStore = defineStore('app', () => {
  const theme = ref<'light' | 'dark' | 'system'>(getStorage('theme', 'system'))
  const isDark = ref(false)
  const searchQuery = ref('')
  const isWindowVisible = ref(true)

  function setTheme(newTheme: 'light' | 'dark' | 'system') {
    theme.value = newTheme
    setStorage('theme', newTheme)
    updateDarkMode()
  }

  function updateDarkMode() {
    if (theme.value === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = theme.value === 'dark'
    }
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  async function toggleWindow() {
    const window = getCurrentWindow()
    const visible = await window.isVisible()
    if (visible) {
      await window.hide()
    } else {
      await window.show()
      await window.setFocus()
    }
    isWindowVisible.value = !visible
  }

  // Initialize theme
  updateDarkMode()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkMode)

  return {
    theme,
    isDark,
    searchQuery,
    isWindowVisible,
    setTheme,
    setSearchQuery,
    toggleWindow
  }
})
