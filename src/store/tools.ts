import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tool } from '../types/tool'
import { getStorage, setStorage } from '../lib/storage'

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<Tool[]>([])
  const favorites = ref<string[]>(getStorage('favorites', []))
  const recentTools = ref<string[]>(getStorage('recentTools', []))

  const favoriteTools = computed(() =>
    tools.value.filter(t => favorites.value.includes(t.id))
  )

  const recentToolsList = computed(() =>
    recentTools.value
      .map(id => tools.value.find(t => t.id === id))
      .filter(Boolean) as Tool[]
  )

  function registerTool(tool: Tool) {
    if (!tools.value.find(t => t.id === tool.id)) {
      tools.value.push(tool)
    }
  }

  function toggleFavorite(toolId: string) {
    const index = favorites.value.indexOf(toolId)
    if (index === -1) {
      favorites.value.push(toolId)
    } else {
      favorites.value.splice(index, 1)
    }
    setStorage('favorites', favorites.value)
  }

  function addRecent(toolId: string) {
    recentTools.value = recentTools.value.filter(id => id !== toolId)
    recentTools.value.unshift(toolId)
    if (recentTools.value.length > 20) {
      recentTools.value = recentTools.value.slice(0, 20)
    }
    setStorage('recentTools', recentTools.value)
  }

  function searchTools(query: string): Tool[] {
    if (!query) return tools.value
    const lowerQuery = query.toLowerCase()
    return tools.value.filter(tool =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    )
  }

  return {
    tools,
    favorites,
    recentTools,
    favoriteTools,
    recentToolsList,
    registerTool,
    toggleFavorite,
    addRecent,
    searchTools
  }
})
