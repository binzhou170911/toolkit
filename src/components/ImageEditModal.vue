<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { RotateCcw, FlipHorizontal, FlipVertical, X, RotateCw, Trash2 } from 'lucide-vue-next'
import {
  processImage,
  defaultTransforms,
  type ImageTransforms
} from '../lib/imageCombiner'

interface EditItem {
  id: string
  name: string
  url: string
  width: number
  height: number
  transforms: ImageTransforms
}

const props = defineProps<{ item: EditItem }>()
const emit = defineEmits<{ apply: [transforms: ImageTransforms]; cancel: [] }>()

const t = ref<ImageTransforms>(JSON.parse(JSON.stringify(props.item.transforms)))
const cropPct = ref({ left: 0, right: 0, top: 0, bottom: 0 })
const natW = ref(props.item.width)
const natH = ref(props.item.height)
const previewRef = ref<HTMLCanvasElement | null>(null)
let source: HTMLImageElement | null = null

function initCropFromProps() {
  const c = props.item.transforms.crop
  if (c && natW.value && natH.value) {
    cropPct.value = {
      left: (c.x / natW.value) * 100,
      top: (c.y / natH.value) * 100,
      right: ((natW.value - c.x - c.w) / natW.value) * 100,
      bottom: ((natH.value - c.y - c.h) / natH.value) * 100
    }
  }
}

function effectiveTransforms(): ImageTransforms {
  const W = natW.value
  const H = natH.value
  const x = (cropPct.value.left / 100) * W
  const y = (cropPct.value.top / 100) * H
  const w = ((100 - cropPct.value.left - cropPct.value.right) / 100) * W
  const h = ((100 - cropPct.value.top - cropPct.value.bottom) / 100) * H
  const crop =
    w > 1 && h > 1 ? { x, y, w, h } : null
  return { ...t.value, crop }
}

function renderPreview() {
  if (!source || !previewRef.value) return
  const processed = processImage(source, effectiveTransforms())
  const canvas = previewRef.value
  const maxW = 320
  const maxH = 320
  const scale = Math.min(maxW / processed.width, maxH / processed.height, 1)
  canvas.width = Math.max(1, Math.round(processed.width * scale))
  canvas.height = Math.max(1, Math.round(processed.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(processed, 0, 0, canvas.width, canvas.height)
}

function rotateLeft() {
  t.value.rotate = ((((t.value.rotate - 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270
  renderPreview()
}
function rotateRight() {
  t.value.rotate = ((t.value.rotate + 90) % 360) as 0 | 90 | 180 | 270
  renderPreview()
}

watch(
  [
    () => t.value.flipH,
    () => t.value.flipV,
    () => t.value.brightness,
    () => t.value.contrast,
    () => t.value.grayscale,
    () => t.value.invert,
    cropPct
  ],
  () => renderPreview(),
  { deep: true }
)

function resetAll() {
  t.value = defaultTransforms()
  cropPct.value = { left: 0, right: 0, top: 0, bottom: 0 }
  renderPreview()
}

function apply() {
  emit('apply', effectiveTransforms())
}

onMounted(async () => {
  initCropFromProps()
  source = new Image()
  source.onload = () => {
    natW.value = source!.naturalWidth
    natH.value = source!.naturalHeight
    renderPreview()
  }
  source.src = props.item.url
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <div class="text-sm font-medium">编辑图片 · {{ item.name }}</div>
        <button class="p-1 rounded-lg hover:bg-secondary" @click="emit('cancel')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-4">
        <!-- Preview -->
        <div
          class="flex items-center justify-center rounded-lg border border-border bg-[repeating-conic-gradient(#e5e5e5_0deg_90deg,#fff_90deg_180deg)] bg-[length:16px_16px] min-h-[200px] p-2"
        >
          <canvas ref="previewRef" class="max-w-full max-h-64 rounded shadow" />
        </div>

        <!-- Rotate / Flip -->
        <div class="flex items-center gap-2">
          <span class="text-sm w-14 flex-shrink-0">变换</span>
          <div class="flex gap-1.5">
            <button class="p-2 rounded-lg bg-secondary hover:bg-secondary/70" @click="rotateLeft" title="左转90°">
              <RotateCcw class="w-4 h-4" />
            </button>
            <button class="p-2 rounded-lg bg-secondary hover:bg-secondary/70" @click="rotateRight" title="右转90°">
              <RotateCw class="w-4 h-4" />
            </button>
            <button
              class="p-2 rounded-lg hover:bg-secondary"
              :class="t.flipH ? 'bg-primary text-primary-foreground' : 'bg-secondary'"
              @click="t.flipH = !t.flipH"
              title="水平翻转"
            >
              <FlipHorizontal class="w-4 h-4" />
            </button>
            <button
              class="p-2 rounded-lg hover:bg-secondary"
              :class="t.flipV ? 'bg-primary text-primary-foreground' : 'bg-secondary'"
              @click="t.flipV = !t.flipV"
              title="垂直翻转"
            >
              <FlipVertical class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm w-14 flex-shrink-0">亮度</span>
            <input type="range" min="0" max="200" step="1" v-model.number="t.brightness" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ t.brightness }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm w-14 flex-shrink-0">对比度</span>
            <input type="range" min="0" max="200" step="1" v-model.number="t.contrast" class="flex-1 accent-primary" />
            <span class="text-xs text-muted-foreground w-10 text-right">{{ t.contrast }}%</span>
          </div>
          <div class="flex items-center gap-4 pl-14">
            <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" v-model="t.grayscale" class="accent-primary" /> 灰度
            </label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input type="checkbox" v-model="t.invert" class="accent-primary" /> 反相
            </label>
          </div>
        </div>

        <!-- Crop -->
        <div class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground">裁剪（各边裁切比例）</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs w-8">左</span>
              <input type="range" min="0" max="50" step="1" v-model.number="cropPct.left" class="flex-1 accent-primary" />
              <span class="text-[10px] text-muted-foreground w-8 text-right">{{ cropPct.left }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs w-8">右</span>
              <input type="range" min="0" max="50" step="1" v-model.number="cropPct.right" class="flex-1 accent-primary" />
              <span class="text-[10px] text-muted-foreground w-8 text-right">{{ cropPct.right }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs w-8">上</span>
              <input type="range" min="0" max="50" step="1" v-model.number="cropPct.top" class="flex-1 accent-primary" />
              <span class="text-[10px] text-muted-foreground w-8 text-right">{{ cropPct.top }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs w-8">下</span>
              <input type="range" min="0" max="50" step="1" v-model.number="cropPct.bottom" class="flex-1 accent-primary" />
              <span class="text-[10px] text-muted-foreground w-8 text-right">{{ cropPct.bottom }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border">
        <button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" @click="resetAll">
          <Trash2 class="w-3.5 h-3.5" /> 重置
        </button>
        <div class="flex gap-2">
          <button class="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-sm" @click="emit('cancel')">
            取消
          </button>
          <button class="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium" @click="apply">
            应用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
