<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowLeft, Plus, X, RefreshCw, ExternalLink } from 'lucide-vue-next'
import { Webview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { getAllModels, addCustomModel, removeCustomModel, type AIModel } from '../tools/ai-hub/models'
import { useToast } from '../hooks/useToast'

const emit = defineEmits<{
  back: []
}>()

const props = defineProps<{
  initialModelId?: string
}>()

const toast = useToast()

const models = ref<AIModel[]>(getAllModels())
const activeModelId = ref<string>(props.initialModelId || models.value[0]?.id || '')
const webviewContainer = ref<HTMLElement | null>(null)
const showAddDialog = ref(false)
const newModel = ref({ name: '', url: '', icon: '🌐' })

const webviews = new Map<string, Webview>()

function getModelById(id: string): AIModel | undefined {
  return models.value.find(m => m.id === id)
}

function waitForLayout(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function positionWebview(webview: Webview) {
  if (!webviewContainer.value) return
  const rect = webviewContainer.value.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  await webview.setPosition(new LogicalPosition(Math.round(rect.left), Math.round(rect.top)))
  await webview.setSize(new LogicalSize(Math.round(rect.width), Math.round(rect.height)))
}

async function createWebviewForModel(model: AIModel): Promise<Webview | undefined> {
  try {
    const parentWindow = getCurrentWindow()
    const rect = webviewContainer.value?.getBoundingClientRect()
    const w = rect && rect.width > 0 ? Math.round(rect.width) : 600
    const h = rect && rect.height > 0 ? Math.round(rect.height) : 400
    const x = rect ? Math.round(rect.left) : 0
    const y = rect ? Math.round(rect.top) : 0

    const label = `ai-hub-${model.id}-${Date.now()}`
    console.log(`Creating webview: ${label} at (${x}, ${y}) size (${w}, ${h})`)

    const webview = new Webview(parentWindow, label, {
      url: model.url,
      x,
      y,
      width: w,
      height: h
    })

    // Wait for webview to be fully created
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Webview creation timeout')), 10000)
      webview.once('tauri://created', () => {
        clearTimeout(timeout)
        console.log(`Webview ready: ${label}`)
        resolve()
      })
      webview.once('tauri://error', (e) => {
        clearTimeout(timeout)
        console.error(`Webview error: ${label}`, e)
        reject(new Error(`Webview creation failed: ${e}`))
      })
    })

    webviews.set(model.id, webview)
    return webview
  } catch (e) {
    console.error('Failed to create webview:', e)
    toast.error(`创建 WebView 失败: ${e}`)
    return undefined
  }
}

async function switchModel(modelId: string) {
  if (modelId === activeModelId.value) return

  // Hide current
  const currentWv = webviews.get(activeModelId.value)
  if (currentWv) {
    try { await currentWv.hide() } catch (e) { console.error('hide error:', e) }
  }

  activeModelId.value = modelId

  // Show or create target
  let targetWv = webviews.get(modelId)
  if (!targetWv) {
    const model = getModelById(modelId)
    if (!model) return
    await waitForLayout()
    targetWv = await createWebviewForModel(model)
    if (!targetWv) return
  }

  await waitForLayout()
  await positionWebview(targetWv)
  try { await targetWv.show() } catch (e) { console.error('show error:', e) }
  try { await targetWv.setFocus() } catch (e) { console.error('setFocus error:', e) }
}

async function reloadCurrent() {
  const wv = webviews.get(activeModelId.value)
  if (!wv) return
  const model = getModelById(activeModelId.value)
  if (!model) return

  try { await wv.close() } catch (e) { console.error('close error:', e) }
  webviews.delete(activeModelId.value)

  await waitForLayout()
  const newWv = await createWebviewForModel(model)
  if (!newWv) return
  await positionWebview(newWv)
  try { await newWv.show() } catch (e) { console.error('show error:', e) }
  try { await newWv.setFocus() } catch (e) { console.error('setFocus error:', e) }
}

async function openInBrowser() {
  const model = getModelById(activeModelId.value)
  if (!model) return
  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(model.url)
  } catch {
    window.open(model.url, '_blank')
  }
}

function handleAddModel() {
  if (!newModel.value.name.trim() || !newModel.value.url.trim()) {
    toast.error('请填写模型名称和地址')
    return
  }

  let url = newModel.value.url.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  const id = newModel.value.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-鿿-]/g, '')
  if (!id) {
    toast.error('模型名称无效')
    return
  }

  if (models.value.find(m => m.id === id)) {
    toast.error('模型名称已存在')
    return
  }

  const model = addCustomModel({
    id,
    name: newModel.value.name.trim(),
    icon: newModel.value.icon.trim() || '🌐',
    url,
    description: newModel.value.name.trim(),
    keywords: [id, newModel.value.name.toLowerCase()],
    color: '#6b7280'
  })

  models.value = getAllModels()
  showAddDialog.value = false
  newModel.value = { name: '', url: '', icon: '🌐' }
  toast.success(`已添加模型: ${model.name}`)
}

function handleRemoveModel(id: string) {
  const model = getModelById(id)
  if (!model || model.builtin) return

  const wv = webviews.get(id)
  if (wv) {
    wv.close().catch(() => {})
    webviews.delete(id)
  }

  removeCustomModel(id)
  models.value = getAllModels()

  if (activeModelId.value === id) {
    activeModelId.value = models.value[0]?.id || ''
    const newActive = webviews.get(activeModelId.value)
    if (newActive) {
      newActive.show().catch(() => {})
    }
  }

  toast.success('已删除模型')
}

let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null

function handleResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(async () => {
    const wv = webviews.get(activeModelId.value)
    if (wv) {
      await positionWebview(wv)
    }
  }, 100)
}

onMounted(async () => {
  // Wait for layout to stabilize
  await waitForLayout()
  await nextTick()

  // Create webview for initial model
  const initialModel = getModelById(activeModelId.value)
  if (initialModel) {
    const wv = await createWebviewForModel(initialModel)
    if (wv) {
      await positionWebview(wv)
      try { await wv.show() } catch (e) { console.error('initial show error:', e) }
    }
  }

  // Listen for window resize
  window.addEventListener('resize', handleResize)

  // Observe container size changes
  if (webviewContainer.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(webviewContainer.value)
  }
})

onUnmounted(() => {
  // Clean up all webviews
  for (const [, wv] of webviews) {
    wv.close().catch(() => {})
  }
  webviews.clear()

  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <!-- Header -->
    <div class="flex items-center gap-2 p-3 border-b border-border bg-background/95 backdrop-blur z-10">
      <button
        @click="emit('back')"
        class="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xl">✨</span>
        <div class="text-sm font-medium whitespace-nowrap">AI 助手</div>
      </div>

      <!-- Model tabs -->
      <div class="flex items-center gap-1 flex-1 overflow-x-auto min-w-0 scrollbar-none pl-2">
        <button
          v-for="model in models"
          :key="model.id"
          @click="switchModel(model.id)"
          class="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors flex-shrink-0 group"
          :class="activeModelId === model.id
            ? 'bg-secondary text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'"
        >
          <img
            v-if="model.logo"
            :src="model.logo"
            :alt="model.name"
            class="w-4 h-4 object-contain"
          />
          <span v-else class="text-sm">{{ model.icon }}</span>
          <span class="text-xs whitespace-nowrap">{{ model.name }}</span>
          <button
            v-if="!model.builtin"
            @click.stop="handleRemoveModel(model.id)"
            class="ml-0.5 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X class="w-3 h-3" />
          </button>
        </button>

        <button
          @click="showAddDialog = true"
          class="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex-shrink-0"
        >
          <Plus class="w-3 h-3" />
          <span class="text-xs">添加</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <button
          @click="reloadCurrent"
          class="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="刷新"
        >
          <RefreshCw class="w-4 h-4" />
        </button>
        <button
          @click="openInBrowser"
          class="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="在浏览器中打开"
        >
          <ExternalLink class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- WebView container -->
    <div ref="webviewContainer" class="flex-1 relative overflow-hidden">
      <!-- WebView will be positioned here as native overlay -->
    </div>

    <!-- Add model dialog -->
    <div
      v-if="showAddDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showAddDialog = false"
    >
      <div class="bg-background border border-border rounded-lg shadow-lg w-80 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium">添加模型</h3>
          <button
            @click="showAddDialog = false"
            class="p-1 rounded hover:bg-secondary transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted-foreground mb-1 block">图标</label>
            <input
              v-model="newModel.icon"
              placeholder="🌐"
              class="w-16 px-2 py-1.5 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-center"
            />
          </div>
          <div>
            <label class="text-xs text-muted-foreground mb-1 block">名称</label>
            <input
              v-model="newModel.name"
              placeholder="Kimi"
              class="w-full px-2 py-1.5 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              @keydown.enter="handleAddModel"
            />
          </div>
          <div>
            <label class="text-xs text-muted-foreground mb-1 block">地址</label>
            <input
              v-model="newModel.url"
              placeholder="https://kimi.moonshot.cn"
              class="w-full px-2 py-1.5 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              @keydown.enter="handleAddModel"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="showAddDialog = false"
            class="px-3 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors"
          >
            取消
          </button>
          <button
            @click="handleAddModel"
            class="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
