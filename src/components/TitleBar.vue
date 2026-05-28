<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X, Settings, Clock, Zap } from 'lucide-vue-next'

const emit = defineEmits<{
  'open-settings': []
  'open-history': []
}>()

const isMaximized = ref(false)

async function checkMaximized() {
  try {
    isMaximized.value = await getCurrentWindow().isMaximized()
  } catch {
    isMaximized.value = false
  }
}

async function handleMinimize() {
  try {
    await getCurrentWindow().minimize()
  } catch (error) {
    console.error('Failed to minimize:', error)
  }
}

async function handleToggleMaximize() {
  try {
    await getCurrentWindow().toggleMaximize()
    await checkMaximized()
  } catch (error) {
    console.error('Failed to toggle maximize:', error)
  }
}

async function handleClose() {
  try {
    await getCurrentWindow().hide()
  } catch (error) {
    console.error('Failed to close:', error)
  }
}

onMounted(() => {
  checkMaximized()
})
</script>

<template>
  <div
    data-tauri-drag-region
    class="flex items-center justify-between h-9 px-2 bg-background border-b border-border select-none"
  >
    <div class="flex items-center gap-2">
      <Zap class="w-4 h-4 text-primary" />
      <span class="text-sm font-medium">Toolkit</span>
    </div>
    <div class="flex items-center gap-1">
      <button
        @click="emit('open-history')"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"
        title="历史记录"
      >
        <Clock class="w-3.5 h-3.5" />
      </button>
      <button
        @click="emit('open-settings')"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"
        title="设置"
      >
        <Settings class="w-3.5 h-3.5" />
      </button>
      <div class="w-px h-4 bg-border mx-1" />
      <button
        @click="handleMinimize"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        @click="handleToggleMaximize"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors"
      >
        <Square class="w-3 h-3" />
      </button>
      <button
        @click="handleClose"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
