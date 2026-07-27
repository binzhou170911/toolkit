<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'

const GRID_SIZE = 11
const PIXEL_SCALE = 24
const CANVAS_SIZE = GRID_SIZE * PIXEL_SCALE

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const currentHex = ref('#000000')
let unlisten: (() => void) | null = null

interface PixelData {
  r: number
  g: number
  b: number
}

interface MagnifierData {
  pixels: PixelData[]
  grid_size: number
  scale: number
}

onMounted(async () => {
  containerRef.value?.focus()

  unlisten = await listen<MagnifierData>('magnifier-pixels', (event) => {
    renderMagnifier(event.payload)
  })
})

onUnmounted(() => {
  unlisten?.()
})

function renderMagnifier(data: MagnifierData) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { pixels, grid_size, scale } = data
  const halfGrid = Math.floor(grid_size / 2)

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Circular clip
  ctx.save()
  ctx.beginPath()
  ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.clip()

  // Draw pixel grid
  for (let y = 0; y < grid_size; y++) {
    for (let x = 0; x < grid_size; x++) {
      const idx = y * grid_size + x
      const pixel = pixels[idx]
      if (!pixel) continue

      ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`
      ctx.fillRect(x * scale, y * scale, scale, scale)

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x * scale, y * scale, scale, scale)
    }
  }

  // Center pixel color
  const centerIdx = halfGrid * grid_size + halfGrid
  const centerPixel = pixels[centerIdx]
  if (centerPixel) {
    currentHex.value = `#${centerPixel.r.toString(16).padStart(2, '0')}${centerPixel.g.toString(16).padStart(2, '0')}${centerPixel.b.toString(16).padStart(2, '0')}`.toUpperCase()
  }

  // Crosshair
  const centerX = CANVAS_SIZE / 2
  const centerY = CANVAS_SIZE / 2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.moveTo(centerX - scale, centerY)
  ctx.lineTo(centerX + scale, centerY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(centerX, centerY - scale)
  ctx.lineTo(centerX, centerY + scale)
  ctx.stroke()

  // Center dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
  ctx.fill()

  // Highlight center pixel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = 2
  ctx.strokeRect(
    halfGrid * scale + 1,
    halfGrid * scale + 1,
    scale - 2,
    scale - 2
  )

  ctx.restore()

  // Circular border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2)
  ctx.stroke()
}

async function handleConfirm() {
  await invoke('confirm_color_pick')
}

async function handleCancel() {
  await invoke('stop_magnifier')
  await getCurrentWindow().close()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="magnifier-container"
    tabindex="0"
    @click="handleConfirm"
    @keydown="handleKeydown"
  >
    <canvas ref="canvasRef" :width="CANVAS_SIZE" :height="CANVAS_SIZE" />
    <div class="color-info">
      <div class="color-swatch" :style="{ backgroundColor: currentHex }" />
      <span class="color-value">{{ currentHex }}</span>
    </div>
    <div class="instruction">点击取色 / Esc 取消</div>
  </div>
</template>

<style scoped>
.magnifier-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: crosshair;
  user-select: none;
  outline: none;
}

canvas {
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.color-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 6px;
  font-size: 12px;
  color: white;
  font-family: monospace;
  backdrop-filter: blur(4px);
}

.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.instruction {
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
