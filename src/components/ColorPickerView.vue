<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Pipette, Copy, Check } from 'lucide-vue-next'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { formatColor, type ColorInfo } from '../tools/color-picker'
import { useToast } from '../hooks/useToast'

const emit = defineEmits<{
  back: []
}>()

const { success, error } = useToast()

const currentColor = ref<ColorInfo | null>(null)
const isPicking = ref(false)
const copiedFormat = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

let unlistenColor: (() => void) | null = null

onMounted(async () => {
  unlistenColor = await listen<string>('color-picked', async (event) => {
    const color = event.payload
    if (color) {
      currentColor.value = formatColor(color)
      success(`已取色: ${color}`)
    }
    isPicking.value = false
  })
})

onUnmounted(() => {
  unlistenColor?.()
})

async function handlePick() {
  isPicking.value = true
  errorMsg.value = null
  copiedFormat.value = null

  try {
    const win = getCurrentWindow()
    await win.hide()

    await new Promise(resolve => setTimeout(resolve, 300))

    await invoke('start_magnifier')
  } catch (e: any) {
    console.error('Color picker error:', e)
    errorMsg.value = e?.message || '取色失败'
    try {
      const win = getCurrentWindow()
      await win.show()
      await win.setFocus()
    } catch {
      // ignore
    }
    isPicking.value = false
  }
}

async function copyColor(format: 'hex' | 'rgb' | 'hsl') {
  if (!currentColor.value) return
  const value = currentColor.value[format]
  if (!value) return

  try {
    await writeText(value)
    copiedFormat.value = format
    success(`已复制: ${value}`)
    setTimeout(() => { copiedFormat.value = null }, 2000)
  } catch {
    error('复制失败')
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/95 backdrop-blur z-10">
      <button
        @click="emit('back')"
        class="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <span class="text-lg">🎨</span>
      <div class="text-sm font-medium">取色器</div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <!-- Color Preview -->
      <div
        class="w-40 h-40 rounded-2xl border-2 border-border shadow-lg transition-colors duration-200"
        :style="{ backgroundColor: currentColor?.hex || 'transparent' }"
      >
        <div
          v-if="!currentColor"
          class="w-full h-full flex items-center justify-center text-muted-foreground"
        >
          <Pipette class="w-12 h-12 opacity-30" />
        </div>
      </div>

      <!-- Pick Button -->
      <button
        @click="handlePick"
        :disabled="isPicking"
        class="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Pipette class="w-5 h-5" />
        <span v-if="isPicking">取色中...</span>
        <span v-else>取色</span>
      </button>

      <!-- Instruction -->
      <div class="text-sm text-muted-foreground text-center">
        点击取色后，将出现放大镜跟随鼠标，点击放大镜确认取色
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="text-sm text-destructive text-center">
        {{ errorMsg }}
      </div>

      <!-- Color Values -->
      <div v-if="currentColor" class="w-full max-w-sm space-y-3">
        <div
          v-for="fmt in (['hex', 'rgb', 'hsl'] as const)"
          :key="fmt"
          class="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-xs text-muted-foreground uppercase w-8 flex-shrink-0">{{ fmt }}</span>
            <span class="text-sm font-mono truncate">{{ currentColor[fmt] }}</span>
          </div>
          <button
            @click="copyColor(fmt)"
            class="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
            :title="`复制 ${fmt.toUpperCase()}`"
          >
            <Check v-if="copiedFormat === fmt" class="w-4 h-4 text-green-500" />
            <Copy v-else class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
