<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import {
  ArrowLeft, Upload, Download, Copy, Trash2, ArrowUp, ArrowDown,
  LayoutGrid, Rows3, Columns3, Pencil, FileImage, Type, Image as ImageIcon
} from 'lucide-vue-next'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { useToast } from '../hooks/useToast'
import ImageEditModal from './ImageEditModal.vue'
import {
  processImage, composite, canvasToPdf, dataUrlToBytes, defaultTransforms,
  type ImageTransforms, type ComposeSettings, type LayoutMode, type FitMode, type WatermarkPosition
} from '../lib/imageCombiner'

const emit = defineEmits<{ back: [] }>()
const { success, error } = useToast()

interface ImageItem {
  id: string
  name: string
  url: string
  width: number
  height: number
  transforms: ImageTransforms
}

const items = ref<ImageItem[]>([])
const layout = ref<LayoutMode>('horizontal')
const gridCols = ref(2)
const spacing = ref(10)
const fit = ref<FitMode>('none')
const cellW = ref(600)
const cellH = ref(600)
const cornerRadius = ref(0)
const borderWidth = ref(0)
const borderColor = ref('#ffffff')
const shadow = ref(false)
const bgType = ref<'solid' | 'transparent' | 'gradient' | 'image'>('solid')
const bgColor = ref('#ffffff')
const bgColor2 = ref('#cccccc')
const bgAngle = ref(135)
const bgImageUrl = ref<string | null>(null)
const wmType = ref<'none' | 'text' | 'image'>('none')
const wmText = ref('仅供示例')
const wmFontSize = ref(28)
const wmColor = ref('#ffffff')
const wmOpacity = ref(0.5)
const wmPosition = ref<WatermarkPosition>('br')
const wmTile = ref(false)
const wmRotation = ref(0)
const wmImageUrl = ref<string | null>(null)
const wmMargin = ref(20)
const wmScale = ref(0.2)
const useFixed = ref(false)
const fixedW = ref(1080)
const fixedH = ref(1080)
const align = ref<'center' | 'top-left'>('center')

const format = ref<'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'>('image/png')
const quality = ref(0.92)

const result = ref('')
const lastCanvas = ref<HTMLCanvasElement | null>(null)
const outputW = ref(0)
const outputH = ref(0)
const isProcessing = ref(false)
const isDragging = ref(false)
const editingId = ref<string | null>(null)

let unlisten: (() => void) | null = null
let recomposeTimer: ReturnType<typeof setTimeout> | null = null

const EXT_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff'
}
function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return EXT_MIME[ext] || 'image/png'
}
function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

async function loadFromPath(path: string) {
  const content = await readFile(path)
  const mime = mimeFromPath(path)
  let binary = ''
  for (let i = 0; i < content.length; i++) binary += String.fromCharCode(content[i])
  const url = `data:${mime};base64,${btoa(binary)}`
  const el = await loadImageEl(url)
  items.value.push({
    id: crypto.randomUUID(),
    name: path.split(/[\\/]/).pop() || 'image',
    url,
    width: el.naturalWidth,
    height: el.naturalHeight,
    transforms: defaultTransforms()
  })
}

async function pickFiles() {
  try {
    const selected = await open({
      multiple: true,
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff'] }]
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    for (const p of paths) await loadFromPath(p)
  } catch (e: any) {
    error('选择文件失败: ' + (e?.message || e))
  }
}

async function handleDrop(paths: string[]) {
  try {
    for (const p of paths) await loadFromPath(p)
  } catch (e: any) {
    error('拖入图片失败: ' + (e?.message || e))
  }
}

function removeItem(id: string) {
  items.value = items.value.filter(i => i.id !== id)
}
function move(id: string, dir: -1 | 1) {
  const idx = items.value.findIndex(i => i.id === id)
  const target = idx + dir
  if (idx < 0 || target < 0 || target >= items.value.length) return
  const arr = items.value.slice()
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  items.value = arr
}

function isEdited(t: ImageTransforms): boolean {
  return (
    t.rotate !== 0 || t.flipH || t.flipV ||
    t.brightness !== 100 || t.contrast !== 100 || t.grayscale || t.invert || !!t.crop
  )
}

function openEdit(id: string) {
  editingId.value = id
}
function onEditApply(transforms: ImageTransforms) {
  const it = items.value.find(i => i.id === editingId.value)
  if (it) it.transforms = transforms
  editingId.value = null
  if (result.value) compose()
}

async function pickImageUrl(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff'] }]
  })
  if (!selected || Array.isArray(selected)) return null
  const content = await readFile(selected)
  const mime = mimeFromPath(selected)
  let binary = ''
  for (let i = 0; i < content.length; i++) binary += String.fromCharCode(content[i])
  return `data:${mime};base64,${btoa(binary)}`
}
async function pickBgImage() {
  const u = await pickImageUrl()
  if (u) bgImageUrl.value = u
}
async function pickWmImage() {
  const u = await pickImageUrl()
  if (u) wmImageUrl.value = u
}

function applyPreset(name: string) {
  if (name === 'wechat9') {
    layout.value = 'grid'; gridCols.value = 3; fit.value = 'cover'
    cellW.value = 360; cellH.value = 360; spacing.value = 2
  } else if (name === 'xhs') {
    layout.value = 'vertical'; fit.value = 'cover'
    cellW.value = 1080; cellH.value = 1440; spacing.value = 0
  } else if (name === 'long') {
    layout.value = 'vertical'; fit.value = 'width'
    cellW.value = 1080; spacing.value = 0
  } else if (name === 'square') {
    fit.value = 'cover'; cellW.value = 1080; cellH.value = 1080
  }
}

function buildSettings(): ComposeSettings {
  const flatTransparent = bgType.value === 'transparent' && format.value !== 'image/png'
  const bgEffColor = flatTransparent ? '#ffffff' : bgColor.value
  return {
    layout: layout.value,
    columns: gridCols.value,
    gap: spacing.value,
    fit: fit.value,
    cellW: cellW.value,
    cellH: cellH.value,
    cornerRadius: cornerRadius.value,
    borderWidth: borderWidth.value,
    borderColor: borderColor.value,
    shadow: shadow.value,
    background: {
      type: flatTransparent ? 'solid' : bgType.value,
      color: bgEffColor,
      color2: bgColor2.value,
      gradientAngle: bgAngle.value,
      imageUrl: bgImageUrl.value
    },
    watermark: {
      type: wmType.value,
      text: wmText.value,
      fontSize: wmFontSize.value,
      color: wmColor.value,
      opacity: wmOpacity.value,
      position: wmPosition.value,
      tile: wmTile.value,
      rotation: wmRotation.value,
      imageUrl: wmImageUrl.value,
      margin: wmMargin.value,
      scale: wmScale.value
    },
    fixedOutput: useFixed.value ? { w: fixedW.value, h: fixedH.value } : null,
    align: align.value
  }
}

async function compose() {
  if (items.value.length === 0) return
  isProcessing.value = true
  try {
    const els = await Promise.all(items.value.map(it => loadImageEl(it.url)))
    const processed = els.map((el, i) => processImage(el, items.value[i].transforms))
    const settings = buildSettings()
    const [bgImg, wmImg] = await Promise.all([
      settings.background.type === 'image' && settings.background.imageUrl
        ? loadImageEl(settings.background.imageUrl)
        : Promise.resolve(null),
      settings.watermark.type === 'image' && settings.watermark.imageUrl
        ? loadImageEl(settings.watermark.imageUrl)
        : Promise.resolve(null)
    ])
    const canvas = composite(processed, settings, wmImg, bgImg)
    lastCanvas.value = canvas
    result.value = canvas.toDataURL(format.value, quality.value)
    outputW.value = canvas.width
    outputH.value = canvas.height
    success('合成完成')
  } catch (e: any) {
    error('合成失败: ' + (e?.message || e))
  } finally {
    isProcessing.value = false
  }
}

async function download() {
  if (!result.value) return
  try {
    let bytes: Uint8Array
    let ext: string
    if (format.value === 'application/pdf') {
      bytes = canvasToPdf(lastCanvas.value!, quality.value)
      ext = 'pdf'
    } else {
      bytes = dataUrlToBytes(result.value)
      ext = format.value === 'image/jpeg' ? 'jpg' : format.value === 'image/webp' ? 'webp' : 'png'
    }
    const filePath = await save({
      defaultPath: `merged.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    })
    if (!filePath) return
    await writeFile(filePath, bytes)
    success(`已保存: ${filePath}`)
  } catch (e: any) {
    error('保存失败: ' + (e?.message || e))
  }
}

async function copyImage() {
  if (!result.value) return
  try {
    await invoke('copy_image_to_clipboard', { dataUrl: result.value })
    success('图片已复制到剪贴板')
  } catch {
    try {
      await navigator.clipboard.writeText(result.value)
      success('图片数据已复制')
    } catch {
      error('复制失败')
    }
  }
}

async function copyBase64() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    success('Base64 已复制')
  } catch (e: any) {
    error('复制失败: ' + (e?.message || e))
  }
}

watch(
  () => [
    items.value.length, layout.value, gridCols.value, spacing.value, fit.value,
    cellW.value, cellH.value, cornerRadius.value, borderWidth.value, borderColor.value,
    shadow.value, bgType.value, bgColor.value, bgColor2.value, bgAngle.value, bgImageUrl.value,
    wmType.value, wmText.value, wmFontSize.value, wmColor.value, wmOpacity.value, wmPosition.value,
    wmTile.value, wmRotation.value, wmImageUrl.value, wmMargin.value, wmScale.value,
    useFixed.value, fixedW.value, fixedH.value, align.value, format.value, quality.value
  ],
  () => {
    if (!items.value.length) return
    if (result.value) {
      if (recomposeTimer) clearTimeout(recomposeTimer)
      recomposeTimer = setTimeout(() => compose(), 300)
    }
  }
)

onMounted(async () => {
  const win = getCurrentWindow()
  unlisten = await win.onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      isDragging.value = true
    } else if (event.payload.type === 'drop') {
      isDragging.value = false
      const paths = event.payload.paths
      if (paths && paths.length > 0) handleDrop(paths)
    } else {
      isDragging.value = false
    }
  })
})

onUnmounted(() => {
  unlisten?.()
  if (recomposeTimer) clearTimeout(recomposeTimer)
})

const wmArrows: Record<WatermarkPosition, string> = {
  tl: '↖', tc: '↑', tr: '↗',
  ml: '←', mc: '•', mr: '→',
  bl: '↙', bc: '↓', br: '↘'
}
const wmOrder: WatermarkPosition[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/95 backdrop-blur z-10">
      <button @click="emit('back')" class="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0">
        <ArrowLeft class="w-4 h-4" />
      </button>
      <span class="text-lg">🧩</span>
      <div class="text-sm font-medium">图片合成</div>
      <span v-if="items.length" class="text-xs text-muted-foreground ml-1">（{{ items.length }} 张）</span>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4 space-y-5">
      <!-- 图片来源 -->
      <section class="space-y-2">
        <div class="text-xs font-medium text-muted-foreground">图片来源</div>
        <div
          :class="[
            'relative border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer',
            isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
          ]"
          @click="pickFiles"
        >
          <Upload class="w-7 h-7 mx-auto mb-1.5 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            {{ isDragging ? '释放文件以添加' : '点击选择图片，或将文件拖拽到此处' }}
          </p>
        </div>

        <div v-if="items.length" class="flex gap-2 overflow-x-auto pb-2">
          <div
            v-for="(item, idx) in items"
            :key="item.id"
            class="relative flex-shrink-0 w-24 rounded-lg border border-border bg-secondary/40 p-1.5"
          >
            <img :src="item.url" :alt="item.name" class="w-full h-16 object-cover rounded-md bg-white" />
            <div class="mt-1 flex items-center justify-between">
              <span class="text-[10px] text-muted-foreground truncate max-w-[2.5rem]" :title="item.name">#{{ idx + 1 }}</span>
              <div class="flex items-center gap-0.5">
                <button
                  class="p-0.5 rounded hover:bg-secondary"
                  :class="isEdited(item.transforms) ? 'text-primary' : ''"
                  @click="openEdit(item.id)" title="编辑"
                >
                  <Pencil class="w-3 h-3" />
                </button>
                <button class="p-0.5 rounded hover:bg-destructive/10 text-destructive" @click="removeItem(item.id)" title="移除">
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
            <span
              v-if="idx > 0"
              class="absolute left-1 bottom-7 p-0.5 rounded hover:bg-secondary"
              @click="move(item.id, -1)"
            ><ArrowUp class="w-3 h-3 opacity-30" /></span>
            <span
              v-if="idx < items.length - 1"
              class="absolute right-1 bottom-7 p-0.5 rounded hover:bg-secondary"
              @click="move(item.id, 1)"
            ><ArrowDown class="w-3 h-3 opacity-30" /></span>
          </div>
        </div>
      </section>

      <!-- 布局与尺寸 -->
      <section class="space-y-3">
        <div class="text-xs font-medium text-muted-foreground">布局与尺寸</div>
        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">布局</span>
          <div class="flex gap-1.5">
            <button
              v-for="opt in ([
                { v: 'horizontal', label: '横向', icon: Columns3 },
                { v: 'vertical', label: '纵向', icon: Rows3 },
                { v: 'grid', label: '网格', icon: LayoutGrid }
              ] as const)"
              :key="opt.v"
              @click="layout = opt.v"
              :class="[
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                layout === opt.v ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'
              ]"
            >
              <component :is="opt.icon" class="w-3.5 h-3.5" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="layout === 'grid'" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">列数</span>
          <input type="number" min="1" max="10" v-model.number="gridCols" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">间距</span>
          <input type="number" min="0" max="200" v-model.number="spacing" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">px</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">缩放</span>
          <select v-model="fit" class="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none">
            <option value="none">原尺寸</option>
            <option value="cover">填充裁剪</option>
            <option value="contain">适应留白</option>
            <option value="stretch">拉伸</option>
            <option value="width">按宽度</option>
          </select>
        </div>

        <div v-if="fit !== 'none' && fit !== 'width'" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">格子</span>
          <input type="number" min="1" max="4000" v-model.number="cellW" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">×</span>
          <input type="number" min="1" max="4000" v-model.number="cellH" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">px</span>
        </div>
        <div v-if="fit === 'width'" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">宽度</span>
          <input type="number" min="1" max="4000" v-model.number="cellW" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">px（高度按原比例）</span>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span class="text-xs text-muted-foreground self-center mr-1">预设:</span>
          <button class="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="applyPreset('wechat9')">微信九宫格</button>
          <button class="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="applyPreset('xhs')">小红书 3:4</button>
          <button class="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="applyPreset('long')">朋友圈长图</button>
          <button class="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="applyPreset('square')">1:1 方块</button>
        </div>
      </section>

      <!-- 外观 -->
      <section class="space-y-3">
        <div class="text-xs font-medium text-muted-foreground">外观</div>
        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">圆角</span>
          <input type="number" min="0" max="200" v-model.number="cornerRadius" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">px</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">边框</span>
          <input type="number" min="0" max="50" v-model.number="borderWidth" class="w-16 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <input type="color" v-model="borderColor" class="w-9 h-8 rounded-md border border-border bg-background" />
        </div>
        <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input type="checkbox" v-model="shadow" class="accent-primary" /> 投影阴影
        </label>

        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">背景</span>
          <select v-model="bgType" class="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none">
            <option value="solid">纯色</option>
            <option value="transparent">透明</option>
            <option value="gradient">渐变</option>
            <option value="image">图片</option>
          </select>
        </div>
        <div v-if="bgType === 'solid'" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">颜色</span>
          <input type="color" v-model="bgColor" class="w-9 h-8 rounded-md border border-border bg-background" />
        </div>
        <div v-if="bgType === 'gradient'" class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">起/止</span>
            <input type="color" v-model="bgColor" class="w-9 h-8 rounded-md border border-border bg-background" />
            <input type="color" v-model="bgColor2" class="w-9 h-8 rounded-md border border-border bg-background" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">角度</span>
            <input type="range" min="0" max="360" step="1" v-model.number="bgAngle" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ bgAngle }}°</span>
          </div>
        </div>
        <div v-if="bgType === 'image'" class="flex items-center gap-2">
          <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="pickBgImage">
            <ImageIcon class="w-3.5 h-3.5" /> 选择背景图
          </button>
          <span v-if="bgImageUrl" class="text-xs text-muted-foreground">已选</span>
        </div>
      </section>

      <!-- 水印 -->
      <section class="space-y-3">
        <div class="text-xs font-medium text-muted-foreground">水印</div>
        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">类型</span>
          <select v-model="wmType" class="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none">
            <option value="none">无</option>
            <option value="text">文字</option>
            <option value="image">图片</option>
          </select>
        </div>
        <template v-if="wmType === 'text'">
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">内容</span>
            <input v-model="wmText" class="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">字号</span>
            <input type="range" min="8" max="120" step="1" v-model.number="wmFontSize" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ wmFontSize }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">颜色</span>
            <input type="color" v-model="wmColor" class="w-9 h-8 rounded-md border border-border bg-background" />
          </div>
        </template>
        <div v-if="wmType === 'image'" class="flex items-center gap-2">
          <button class="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 text-xs" @click="pickWmImage">
            <ImageIcon class="w-3.5 h-3.5" /> 选择水印图
          </button>
          <span v-if="wmImageUrl" class="text-xs text-muted-foreground">已选</span>
          <template v-if="wmType === 'image'">
            <span class="text-sm w-16 flex-shrink-0">大小</span>
            <input type="range" min="0.05" max="1" step="0.01" v-model.number="wmScale" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ Math.round(wmScale * 100) }}%</span>
          </template>
        </div>
        <template v-if="wmType !== 'none'">
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">位置</span>
            <div class="grid grid-cols-3 gap-1 w-28">
              <button
                v-for="p in wmOrder"
                :key="p"
                @click="wmPosition = p"
                :class="[
                  'h-7 rounded-md text-sm flex items-center justify-center',
                  wmPosition === p ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'
                ]"
              >{{ wmArrows[p] }}</button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">透明度</span>
            <input type="range" min="0" max="1" step="0.05" v-model.number="wmOpacity" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ Math.round(wmOpacity * 100) }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">边距</span>
            <input type="number" min="0" max="500" v-model.number="wmMargin" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
            <span class="text-xs text-muted-foreground">px</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-16 flex-shrink-0">旋转</span>
            <input type="range" min="-180" max="180" step="1" v-model.number="wmRotation" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ wmRotation }}°</span>
          </div>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input type="checkbox" v-model="wmTile" class="accent-primary" /> 平铺水印
          </label>
        </template>
      </section>

      <!-- 输出 -->
      <section class="space-y-3">
        <div class="text-xs font-medium text-muted-foreground">输出</div>
        <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input type="checkbox" v-model="useFixed" class="accent-primary" /> 固定画布尺寸
        </label>
        <div v-if="useFixed" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">尺寸</span>
          <input type="number" min="1" max="8000" v-model.number="fixedW" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <span class="text-xs text-muted-foreground">×</span>
          <input type="number" min="1" max="8000" v-model.number="fixedH" class="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none" />
          <select v-model="align" class="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none">
            <option value="center">居中</option>
            <option value="top-left">左上</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">格式</span>
          <select v-model="format" class="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none">
            <option value="image/png">PNG（无损/透明）</option>
            <option value="image/jpeg">JPEG（更小）</option>
            <option value="image/webp">WebP（更小）</option>
            <option value="application/pdf">PDF（一页）</option>
          </select>
        </div>
        <div v-if="format !== 'image/png'" class="flex items-center gap-2">
          <span class="text-sm w-16 flex-shrink-0">质量</span>
          <input type="range" min="0.1" max="1" step="0.01" v-model.number="quality" class="flex-1 accent-primary" />
          <span class="text-xs text-muted-foreground w-10 text-right">{{ Math.round(quality * 100) }}%</span>
        </div>
      </section>

      <!-- 合成 -->
      <button
        @click="compose"
        :disabled="items.length === 0 || isProcessing"
        class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isProcessing ? '合成中...' : '合成预览' }}
      </button>

      <!-- 结果 -->
      <section v-if="result" class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs font-medium text-muted-foreground">合成结果 · {{ outputW }} × {{ outputH }} px</div>
          <div class="flex gap-1.5">
            <button class="p-1.5 rounded-lg hover:bg-secondary transition-colors" @click="copyImage" title="复制图片">
              <Copy class="w-4 h-4" />
            </button>
            <button class="p-1.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1 text-xs" @click="copyBase64" title="复制 Base64">
              <Type class="w-3.5 h-3.5" />64
            </button>
            <button class="p-1.5 rounded-lg hover:bg-secondary transition-colors" @click="download" title="下载">
              <component :is="format === 'application/pdf' ? FileImage : Download" class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          class="rounded-lg border border-border overflow-auto flex items-center justify-center p-2 max-h-80"
          :style="(bgType === 'transparent' && format === 'image/png')
            ? { backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,0 8px,8px -8px,-8px 0' }
            : {}"
        >
          <img :src="result" alt="合成结果" class="max-w-full" />
        </div>
      </section>
    </div>

    <!-- 编辑弹窗 -->
    <ImageEditModal
      v-if="editingId"
      :item="items.find(i => i.id === editingId)!"
      @apply="onEditApply"
      @cancel="editingId = null"
    />
  </div>
</template>
