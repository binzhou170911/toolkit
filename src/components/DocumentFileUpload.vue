<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Upload } from 'lucide-vue-next'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { readFile } from '@tauri-apps/plugin-fs'

const emit = defineEmits<{
  'file-drop': [file: { name: string; buffer: ArrayBuffer; size: number }]
}>()

const isDragging = ref(false)
let unlisten: (() => void) | null = null

onMounted(async () => {
  const window = getCurrentWindow()
  unlisten = await window.onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      isDragging.value = true
    } else if (event.payload.type === 'drop') {
      isDragging.value = false
      const paths = event.payload.paths
      if (paths && paths.length > 0) {
        handleTauriFileDrop(paths[0])
      }
    } else {
      isDragging.value = false
    }
  })
})

onUnmounted(() => {
  if (unlisten) {
    unlisten()
  }
})

async function handleTauriFileDrop(path: string) {
  try {
    const content = await readFile(path)
    const fileName = path.split('/').pop() || 'unknown'
    emit('file-drop', {
      name: fileName,
      buffer: content.buffer,
      size: content.length
    })
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer
      emit('file-drop', {
        name: file.name,
        buffer: buffer,
        size: file.size
      })
    }
    reader.readAsArrayBuffer(file)
    input.value = ''
  }
}
</script>

<template>
  <div
    :class="[
      'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
      isDragging
        ? 'border-primary bg-primary/10'
        : 'border-muted-foreground/30 hover:border-muted-foreground/50'
    ]"
  >
    <input
      type="file"
      accept=".docx,.pdf,.md,.markdown"
      @change="handleFileSelect"
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
    <Upload class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
    <p class="text-sm text-muted-foreground">
      {{ isDragging ? '释放文件' : '拖拽 Word/PDF/Markdown 文件到此处或点击选择' }}
    </p>
    <p class="text-xs text-muted-foreground mt-1">
      支持 .docx, .pdf, .md 格式，最大 10MB
    </p>
  </div>
</template>
