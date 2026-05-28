import { ref, onMounted, onUnmounted } from 'vue'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { ClipboardRecommendation } from '../types/tool'
import { useToolsStore } from '../store/tools'

export function useClipboard() {
  const clipboardContent = ref<string>('')
  const recommendations = ref<ClipboardRecommendation[]>([])
  const isMonitoring = ref(true)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const toolsStore = useToolsStore()

  async function checkClipboard() {
    if (!isMonitoring.value) return

    try {
      const text = await readText()
      console.log('Clipboard text:', text)
      if (text && text !== clipboardContent.value) {
        clipboardContent.value = text
        detectContent(text)
      }
    } catch (error) {
      console.error('Clipboard read error:', error)
    }
  }

  function detectContent(content: string) {
    const recs: ClipboardRecommendation[] = []

    for (const tool of toolsStore.tools) {
      if (tool.detect) {
        const score = tool.detect(content)
        if (score > 0) {
          recs.push({
            tool,
            action: tool.actions[0],
            score
          })
        }
      }
    }

    recommendations.value = recs.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  function startMonitoring() {
    isMonitoring.value = true
    // Check immediately when starting
    checkClipboard()
    intervalId = setInterval(checkClipboard, 1000)
  }

  function stopMonitoring() {
    isMonitoring.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function toggleMonitoring() {
    if (isMonitoring.value) {
      stopMonitoring()
    } else {
      startMonitoring()
    }
  }

  // Check clipboard when window becomes visible
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkClipboard()
    }
  }

  onMounted(() => {
    startMonitoring()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for window show events
    const appWindow = getCurrentWindow()
    appWindow.onResized(() => {
      // Window resized, might be visible now
      checkClipboard()
    })
  })

  onUnmounted(() => {
    stopMonitoring()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    clipboardContent,
    recommendations,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring
  }
}
