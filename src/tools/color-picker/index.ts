import type { Tool } from '../../types/tool'

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  }
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) }
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

export interface ColorInfo {
  hex: string
  rgb: string
  hsl: string
}

export function formatColor(hex: string): ColorInfo {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return { hex, rgb: '', hsl: '' }
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return {
    hex: hex.toUpperCase(),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  }
}

export async function pickColor(): Promise<ColorInfo> {
  const { invoke } = await import('@tauri-apps/api/core')
  const hex = await invoke<string>('get_pixel_color', { x: 0, y: 0 })
  return formatColor(hex)
}

export const colorPickerTool: Tool = {
  id: 'color-picker',
  name: '取色器',
  description: '从屏幕任意位置提取颜色值',
  icon: '🎨',
  category: '工具',
  keywords: ['颜色', '取色', 'color', 'picker', '吸管', 'eyedropper', '色值', 'hex', 'rgb', 'hsl'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'pick',
      name: '取色',
      execute: async () => '请使用取色器界面'
    }
  ]
}
