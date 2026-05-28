<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Star, Copy, Download, FileUp, Maximize2, Minimize2, Play, Trash2 } from 'lucide-vue-next'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { useToolsStore } from '../store/tools'
import { useHistoryStore } from '../store/history'
import { useToast } from '../hooks/useToast'
import Button from './ui/Button.vue'
import FileDropZone from './FileDropZone.vue'
import CodeHighlight from './CodeHighlight.vue'

const props = defineProps<{
  toolId: string
}>()

const emit = defineEmits<{
  back: []
}>()

const toolsStore = useToolsStore()
const historyStore = useHistoryStore()
const toast = useToast()

const tool = computed(() => toolsStore.tools.find(t => t.id === props.toolId))
const selectedAction = ref<string | null>(null)
const inputText = ref('')
const outputText = ref('')
const isProcessing = ref(false)
const showFileDrop = ref(false)
const isExpanded = ref(false)
const showInput = ref(true)

const isFavorite = computed(() => tool.value ? toolsStore.favorites.includes(tool.value.id) : false)
const inputRef = ref<HTMLTextAreaElement | null>(null)

onMounted(() => {
  if (tool.value && tool.value.actions.length > 0) {
    selectedAction.value = tool.value.actions[0].id
  }
  // Auto focus input
  setTimeout(() => {
    inputRef.value?.focus()
  }, 100)
})

async function executeAction() {
  if (!tool.value || !selectedAction.value || !inputText.value) return

  const action = tool.value.actions.find(a => a.id === selectedAction.value)
  if (!action) return

  isProcessing.value = true
  try {
    outputText.value = await action.execute(inputText.value)
    historyStore.addEntry({
      toolId: tool.value.id,
      actionId: action.id,
      input: inputText.value,
      output: outputText.value
    })
    // Collapse input after execution
    showInput.value = false
  } catch (error) {
    outputText.value = `Error: ${error}`
    toast.error(`执行失败: ${error}`)
  } finally {
    isProcessing.value = false
  }
}

function toggleFavorite() {
  if (tool.value) {
    const wasFavorite = isFavorite.value
    toolsStore.toggleFavorite(tool.value.id)
    toast.success(wasFavorite ? '已取消收藏' : '已添加收藏')
  }
}

async function copyOutput() {
  try {
    if (outputText.value.startsWith('data:image/')) {
      // For images, try Rust backend first, then fall back to text copy
      try {
        await invoke('copy_image_to_clipboard', { dataUrl: outputText.value })
        toast.success('图片已复制到剪贴板')
      } catch {
        // Fall back to copying data URL as text
        await navigator.clipboard.writeText(outputText.value)
        toast.success('图片数据已复制到剪贴板')
      }
    } else {
      await navigator.clipboard.writeText(outputText.value)
      toast.success('已复制到剪贴板')
    }
  } catch (error) {
    toast.error('复制失败')
  }
}

async function downloadOutput() {
  if (!tool.value || !outputText.value) return

  try {
    if (outputText.value.startsWith('data:image/')) {
      // Download as image
      const filePath = await save({
        defaultPath: `${tool.value.name}-output.png`,
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (filePath) {
        // Convert data URL to binary and save
        const base64Data = outputText.value.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        await writeFile(filePath, bytes)
        toast.success(`图片已保存到: ${filePath}`)
      }
    } else {
      // Download as text
      const filePath = await save({
        defaultPath: `${tool.value.name}-output.txt`,
        filters: [
          { name: 'Text Files', extensions: ['txt', 'json', 'yaml', 'xml'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (filePath) {
        await writeTextFile(filePath, outputText.value)
        toast.success(`文件已保存到: ${filePath}`)
      }
    }
  } catch (error) {
    toast.error(`保存失败: ${error}`)
  }
}

function handlePaste() {
  navigator.clipboard.readText().then(text => {
    inputText.value = text
    toast.success('已粘贴')
  }).catch(() => {
    toast.error('粘贴失败')
  })
}

function handleFileDrop(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    inputText.value = e.target?.result as string
    showFileDrop.value = false
    toast.success(`已加载文件: ${file.name}`)
  }
  reader.readAsText(file)
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
}

const placeholder = computed(() => {
  if (!tool.value || !selectedAction.value) return '在此输入或粘贴内容...'

  // QR Code custom generate
  if (tool.value.id === 'qrcode-tool' && selectedAction.value === 'generate-custom') {
    return '第一行：二维码内容\n第二行：前景色（如 #FF0000）\n第三行：背景色（如 #FFFFFF）\n第四行：尺寸（如 512）'
  }

  // JSON to YAML
  if (tool.value.id === 'json-formatter' && selectedAction.value === 'to-yaml') {
    return '输入 JSON 数据，将转换为 YAML 格式...'
  }

  // JSON to XML
  if (tool.value.id === 'json-formatter' && selectedAction.value === 'to-xml') {
    return '输入 JSON 数据，将转换为 XML 格式...'
  }

  // Base64
  if (tool.value.id === 'base64-codec') {
    return selectedAction.value === 'encode' ? '输入要编码的文本...' : '输入 Base64 字符串...'
  }

  // Hash
  if (tool.value.id === 'hash-calculator') {
    return '输入要计算哈希的文本...'
  }

  // Text codec
  if (tool.value.id === 'text-codec') {
    const action = selectedAction.value
    if (action.includes('url')) return action.includes('encode') ? '输入要 URL 编码的文本...' : '输入 URL 编码的字符串...'
    if (action.includes('html')) return action.includes('encode') ? '输入要 HTML 编码的文本...' : '输入 HTML 编码的字符串...'
    if (action.includes('unicode')) return action.includes('escape') ? '输入要 Unicode 转义的文本...' : '输入 Unicode 转义字符串...'
    if (action.includes('hex')) return action === 'to-hex' ? '输入要转为 Hex 的文本...' : '输入 Hex 字符串...'
    if (action === 'unescape') return '输入包含转义字符的字符串...'
  }

  // Timestamp
  if (tool.value.id === 'timestamp-converter') {
    return '输入时间戳或日期时间字符串...'
  }

  return '在此输入或粘贴内容...'
})
</script>

<template>
  <div v-if="tool" class="flex flex-col h-full bg-background">
    <!-- Header with Execute Button -->
    <div class="flex items-center gap-2 p-3 border-b border-border bg-background/95 backdrop-blur z-10">
      <button
        @click="emit('back')"
        class="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xl">{{ tool.icon }}</span>
        <div class="text-sm font-medium whitespace-nowrap">{{ tool.name }}</div>
      </div>

      <!-- Action Selector -->
      <div class="flex items-center gap-4 flex-1 overflow-x-auto min-w-0 scrollbar-none pl-2">
        <button
          v-for="action in tool.actions"
          :key="action.id"
          @click="selectedAction = action.id"
          :class="[
            'whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:scale-105',
            selectedAction === action.id
              ? 'text-sm font-bold text-foreground scale-105'
              : 'text-xs text-muted-foreground hover:text-foreground hover:font-medium'
          ]"
        >
          {{ action.name }}
        </button>
      </div>

      <!-- Execute Button -->
      <button
        @click="executeAction"
        :disabled="!inputText || isProcessing"
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-all duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed text-foreground hover:text-foreground/80 active:scale-95"
      >
        <Play class="w-3.5 h-3.5" />
        {{ isProcessing ? '处理中...' : '执行' }}
      </button>

      <button
        @click="toggleFavorite"
        class="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <Star
          :class="[
            'w-4 h-4',
            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          ]"
        />
      </button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Toggle Input/Output View -->
      <div v-if="isExpanded && outputText" class="flex-1 flex flex-col overflow-hidden">
        <!-- Expanded Output -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">输出结果</span>
            <span class="text-xs text-muted-foreground">({{ outputText.length }} 字符)</span>
          </div>
          <div class="flex gap-1">
            <Button variant="ghost" size="sm" @click="copyOutput">
              <Copy class="w-3.5 h-3.5 mr-1" />
              复制
            </Button>
            <Button variant="ghost" size="sm" @click="downloadOutput">
              <Download class="w-3.5 h-3.5 mr-1" />
              下载
            </Button>
            <Button variant="ghost" size="sm" @click="isExpanded = false">
              <Minimize2 class="w-3.5 h-3.5 mr-1" />
              退出全屏
            </Button>
          </div>
        </div>
        <div class="flex-1 overflow-auto">
          <div v-if="outputText.startsWith('data:image/')" class="flex items-center justify-center p-4 h-full">
            <img :src="outputText" alt="Generated Image" class="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          </div>
          <CodeHighlight
            v-else-if="tool.id === 'json-formatter' && selectedAction?.includes('format')"
            :code="outputText"
            language="json"
            class="h-full"
          />
          <pre v-else class="p-4 text-sm font-mono whitespace-pre-wrap break-words h-full">{{ outputText }}</pre>
        </div>
      </div>

      <!-- Normal View -->
      <template v-else>
        <!-- Input Area - Collapsible -->
        <div :class="['border-b border-border', !outputText && showInput ? 'flex-1 flex flex-col' : '']">
          <div
            class="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            @click="showInput = !showInput"
          >
            <div class="flex items-center gap-2 min-w-[120px]">
              <span class="text-sm font-medium">输入</span>
              <span class="text-xs text-muted-foreground">
                {{ inputText ? `${inputText.length} 字符` : '0 字符' }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="sm" @click.stop="handlePaste">
                <Copy class="w-3 h-3 mr-1" />
                粘贴
              </Button>
              <Button variant="ghost" size="sm" @click.stop="showFileDrop = !showFileDrop">
                <FileUp class="w-3 h-3 mr-1" />
                文件
              </Button>
              <Button variant="ghost" size="sm" @click.stop="clearAll">
                <Trash2 class="w-3 h-3 mr-1" />
                清空
              </Button>
              <div class="ml-1 w-4 h-4 flex items-center justify-center text-muted-foreground">
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': !showInput }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <transition
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[500px] opacity-100"
            leave-from-class="max-h-[500px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-if="showInput" class="overflow-hidden flex-1 flex flex-col">
              <FileDropZone
                v-if="showFileDrop"
                @file-drop="handleFileDrop"
                class="mx-4 mt-2"
              />
              <textarea
                ref="inputRef"
                v-model="inputText"
                class="flex-1 w-full p-4 text-sm resize-none focus:outline-none font-mono bg-background border-0 min-h-[120px]"
                :placeholder="placeholder"
              />
            </div>
          </transition>
        </div>

        <!-- Output Area - Only show after execution -->
        <div v-if="outputText" class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <div class="flex items-center gap-2 min-w-[120px]">
              <span class="text-sm font-medium">输出</span>
              <span class="text-xs text-muted-foreground">
                {{ outputText.length }} 字符
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="sm" @click="copyOutput">
                <Copy class="w-3 h-3 mr-1" />
                复制
              </Button>
              <Button variant="ghost" size="sm" @click="downloadOutput">
                <Download class="w-3 h-3 mr-1" />
                下载
              </Button>
              <Button variant="ghost" size="sm" @click="isExpanded = true">
                <Maximize2 class="w-3 h-3 mr-1" />
                全屏
              </Button>
              <div class="ml-1 w-4 h-4"></div>
            </div>
          </div>
          <div class="flex-1 overflow-auto">
            <div v-if="outputText.startsWith('data:image/')" class="flex items-center justify-center p-4 h-full">
              <img :src="outputText" alt="Generated Image" class="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
            <CodeHighlight
              v-else-if="tool.id === 'json-formatter' && selectedAction?.includes('format')"
              :code="outputText"
              language="json"
              class="h-full"
            />
            <pre v-else class="p-4 text-sm font-mono whitespace-pre-wrap break-words h-full bg-muted/20">{{ outputText }}</pre>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
