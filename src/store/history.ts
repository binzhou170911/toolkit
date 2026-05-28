import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage, setStorage } from '../lib/storage'

export interface HistoryEntry {
  id: string
  toolId: string
  actionId: string
  input: string
  output: string
  timestamp: number
}

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>(getStorage('history', []))

  function addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }
    entries.value.unshift(newEntry)
    cleanupOldEntries()
    setStorage('history', entries.value)
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
    setStorage('history', entries.value)
  }

  function clearHistory() {
    entries.value = []
    setStorage('history', entries.value)
  }

  function cleanupOldEntries() {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    entries.value = entries.value.filter(e => e.timestamp > sevenDaysAgo)
  }

  return {
    entries,
    addEntry,
    removeEntry,
    clearHistory
  }
})
