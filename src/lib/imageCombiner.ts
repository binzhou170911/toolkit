// 图片合成核心库：纯前端 Canvas 实现
// 负责：单图预处理（裁剪/旋转/翻转/滤镜）、布局计算、合成（圆角/边框/阴影/背景/水印）、导出（Blob/PDF/Base64）

export type LayoutMode = 'horizontal' | 'vertical' | 'grid' | 'nine-grid'
export type FitMode = 'none' | 'cover' | 'contain' | 'stretch' | 'width'

export interface ImageTransforms {
  rotate: 0 | 90 | 180 | 270
  flipH: boolean
  flipV: boolean
  brightness: number // 百分比，100=不变
  contrast: number // 百分比，100=不变
  grayscale: boolean
  invert: boolean
  crop: { x: number; y: number; w: number; h: number } | null // 基于原始像素
}

export interface BackgroundSettings {
  type: 'solid' | 'transparent' | 'gradient' | 'image'
  color: string
  color2: string
  gradientAngle: number // 度
  imageUrl: string | null
}

export type WatermarkPosition =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'mc' | 'mr'
  | 'bl' | 'bc' | 'br'

export interface WatermarkSettings {
  type: 'none' | 'text' | 'image'
  text: string
  fontSize: number
  color: string
  opacity: number // 0-1
  position: WatermarkPosition
  tile: boolean
  rotation: number // 度
  imageUrl: string | null
  margin: number // px
  scale: number // 水印图片相对输出宽度的比例 0-1
}

export interface ComposeSettings {
  layout: LayoutMode
  columns: number
  gap: number
  fit: FitMode
  cellW: number
  cellH: number
  cornerRadius: number
  borderWidth: number
  borderColor: string
  shadow: boolean
  background: BackgroundSettings
  watermark: WatermarkSettings
  fixedOutput: { w: number; h: number } | null
  align: 'center' | 'top-left'
}

export function defaultTransforms(): ImageTransforms {
  return {
    rotate: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    grayscale: false,
    invert: false,
    crop: null
  }
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function natSize(src: HTMLImageElement | HTMLCanvasElement): { w: number; h: number } {
  const img = src as HTMLImageElement
  const cnv = src as HTMLCanvasElement
  return {
    w: img.naturalWidth || cnv.width,
    h: img.naturalHeight || cnv.height
  }
}

/**
 * 对单张图做预处理：裁剪 → 旋转 → 翻转 → 滤镜（亮度/对比度/灰度/反相）。
 * 返回处理后的 canvas（尺寸为最终尺寸）。
 */
export function processImage(
  src: HTMLImageElement | HTMLCanvasElement,
  t: ImageTransforms
): HTMLCanvasElement {
  const { w: natW, h: natH } = natSize(src)
  let base = createCanvas(natW, natH)
  base.getContext('2d')!.drawImage(src as CanvasImageSource, 0, 0, natW, natH)

  // 裁剪
  if (t.crop) {
    const { x, y, w, h } = t.crop
    const ix = Math.max(0, Math.round(x))
    const iy = Math.max(0, Math.round(y))
    const cw = Math.max(1, Math.min(Math.round(w), natW - ix))
    const ch = Math.max(1, Math.min(Math.round(h), natH - iy))
    const cc = createCanvas(cw, ch)
    cc.getContext('2d')!.drawImage(base, ix, iy, cw, ch, 0, 0, cw, ch)
    base = cc
  }

  // 旋转
  let rot = base
  if (t.rotate !== 0) {
    const angle = (t.rotate * Math.PI) / 180
    const ow = t.rotate === 90 || t.rotate === 270 ? base.height : base.width
    const oh = t.rotate === 90 || t.rotate === 270 ? base.width : base.height
    const rc = createCanvas(ow, oh)
    const rctx = rc.getContext('2d')!
    rctx.translate(ow / 2, oh / 2)
    rctx.rotate(angle)
    rctx.drawImage(base, -base.width / 2, -base.height / 2)
    rot = rc
  }

  // 翻转
  let flipped = rot
  if (t.flipH || t.flipV) {
    const fc = createCanvas(rot.width, rot.height)
    const fctx = fc.getContext('2d')!
    fctx.translate(t.flipH ? rot.width : 0, t.flipV ? rot.height : 0)
    fctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
    fctx.drawImage(rot, 0, 0)
    flipped = fc
  }

  // 滤镜（像素处理，兼容 WebKit）
  const needFilter =
    t.brightness !== 100 || t.contrast !== 100 || t.grayscale || t.invert
  if (needFilter) {
    const fctx = flipped.getContext('2d')!
    const imgData = fctx.getImageData(0, 0, flipped.width, flipped.height)
    const d = imgData.data
    const b = t.brightness / 100
    const c = t.contrast / 100
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] / 255
      let g = d[i + 1] / 255
      let bl = d[i + 2] / 255
      // 亮度
      r *= b; g *= b; bl *= b
      // 对比度
      r = (r - 0.5) * c + 0.5
      g = (g - 0.5) * c + 0.5
      bl = (bl - 0.5) * c + 0.5
      // 灰度
      if (t.grayscale) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * bl
        r = g = bl = lum
      }
      // 反相
      if (t.invert) {
        r = 1 - r; g = 1 - g; bl = 1 - bl
      }
      d[i] = clamp255(r * 255)
      d[i + 1] = clamp255(g * 255)
      d[i + 2] = clamp255(bl * 255)
    }
    fctx.putImageData(imgData, 0, 0)
  }

  return flipped
}

interface Placed {
  canvas: HTMLCanvasElement
  x: number
  y: number
  cellW: number // 布局占据的格子尺寸
  cellH: number
  drawW: number // 实际绘制尺寸（用于 cover 溢出/ contain 留白）
  drawH: number
}

function fitCell(
  canvas: HTMLCanvasElement,
  fit: FitMode,
  cellW: number,
  cellH: number
): { w: number; h: number; drawW: number; drawH: number } {
  if (fit === 'none') {
    return { w: canvas.width, h: canvas.height, drawW: canvas.width, drawH: canvas.height }
  }
  if (fit === 'width') {
    const dh = cellW * (canvas.height / canvas.width)
    return { w: cellW, h: dh, drawW: cellW, drawH: dh }
  }
  if (fit === 'stretch') {
    return { w: cellW, h: cellH, drawW: cellW, drawH: cellH }
  }
  const iw = canvas.width
  const ih = canvas.height
  if (fit === 'contain') {
    const scale = Math.min(cellW / iw, cellH / ih)
    return { w: cellW, h: cellH, drawW: iw * scale, drawH: ih * scale }
  }
  // cover
  const scale = Math.max(cellW / iw, cellH / ih)
  return { w: cellW, h: cellH, drawW: iw * scale, drawH: ih * scale }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function gradientCoords(angleDeg: number, w: number, h: number) {
  const a = (angleDeg * Math.PI) / 180
  const x = Math.cos(a)
  const y = Math.sin(a)
  const cx = w / 2
  const cy = h / 2
  const len = (Math.abs(w * x) + Math.abs(h * y)) / 2
  return { x0: cx - x * len, y0: cy - y * len, x1: cx + x * len, y1: cy + y * len }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: BackgroundSettings,
  bgImage?: HTMLImageElement | null
) {
  if (bg.type === 'transparent') return
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (bg.type === 'gradient') {
    const { x0, y0, x1, y1 } = gradientCoords(bg.gradientAngle, w, h)
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, bg.color)
    g.addColorStop(1, bg.color2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (bg.type === 'image') {
    const img = bgImage && bgImage.naturalWidth ? bgImage : null
    if (img) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }
  }
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wm: WatermarkSettings,
  wmImg: HTMLImageElement | null
) {
  if (wm.type === 'none') return
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, wm.opacity))

  if (wm.type === 'text' && wm.text) {
    ctx.fillStyle = wm.color
    ctx.font = `${wm.fontSize}px sans-serif`
    const horizontal = wm.position[1]
    ctx.textAlign =
      horizontal === 'l' ? 'left' : horizontal === 'c' ? 'center' : 'right'
    const vertical = wm.position[0]
    ctx.textBaseline =
      vertical === 't' ? 'top' : vertical === 'm' ? 'middle' : 'bottom'
    const m = wm.margin

    if (wm.tile) {
      ctx.translate(W / 2, H / 2)
      ctx.rotate((wm.rotation * Math.PI) / 180)
      const step = wm.fontSize * 2.4
      const dim = Math.max(W, H) * 1.5
      for (let y = -dim; y <= dim; y += step) {
        for (let x = -dim; x <= dim; x += step) {
          ctx.fillText(wm.text, x, y)
        }
      }
    } else {
      let x = W / 2
      let y = H / 2
      if (horizontal === 'l') x = m
      else if (horizontal === 'r') x = W - m
      if (vertical === 't') y = m
      else if (vertical === 'b') y = H - m
      ctx.fillText(wm.text, x, y)
    }
  } else if (wm.type === 'image' && wmImg && wmImg.naturalWidth) {
    const dw = Math.max(8, W * wm.scale)
    const scale = dw / wmImg.naturalWidth
    const dh = wmImg.naturalHeight * scale
    const m = wm.margin
    const horizontal = wm.position[1]
    const vertical = wm.position[0]
    let x = W / 2 - dw / 2
    let y = H / 2 - dh / 2
    if (horizontal === 'l') x = m
    else if (horizontal === 'r') x = W - dw - m
    if (vertical === 't') y = m
    else if (vertical === 'b') y = H - dh - m
    if (wm.tile) {
      ctx.translate(W / 2, H / 2)
      ctx.rotate((wm.rotation * Math.PI) / 180)
      const stepX = dw + 12
      const stepY = dh + 12
      const dim = Math.max(W, H)
      for (let yy = -dim; yy <= dim; yy += stepY) {
        for (let xx = -dim; xx <= dim; xx += stepX) {
          ctx.drawImage(wmImg, xx - dw / 2, yy - dh / 2, dw, dh)
        }
      }
    } else {
      ctx.drawImage(wmImg, x, y, dw, dh)
    }
  }
  ctx.restore()
}

/**
 * 计算布局并合成最终画布。
 * @param processed 每张图已预处理的 canvas（顺序即拼合顺序）
 * @param settings   合成设置
 * @param watermarkImg 水印图片（仅当 settings.watermark.type==='image' 时需要，已加载）
 */
export function composite(
  processed: HTMLCanvasElement[],
  settings: ComposeSettings,
  watermarkImg: HTMLImageElement | null = null,
  bgImage: HTMLImageElement | null = null
): HTMLCanvasElement {
  const n = processed.length
  const gap = settings.gap

  // 计算每张图的格子尺寸与绘制尺寸
  const fits = processed.map((c) =>
    fitCell(c, settings.fit, settings.cellW, settings.cellH)
  )

  // 计算行列
  let cols = n
  let rows = 1
  if (settings.layout === 'vertical') {
    cols = 1
    rows = n
  } else if (settings.layout === 'grid' || settings.layout === 'nine-grid') {
    cols = settings.layout === 'nine-grid' ? 3 : Math.max(1, Math.min(settings.columns, n))
    rows = Math.ceil(n / cols)
  }

  // 各布局的总尺寸与放置
  const placed: Placed[] = []
  let totalW = 0
  let totalH = 0

  if (settings.layout === 'horizontal') {
    totalW = fits.reduce((a, f) => a + f.w, 0) + gap * (n - 1)
    totalH = Math.max(...fits.map((f) => f.h))
    let xCursor = 0
    for (let i = 0; i < n; i++) {
      const f = fits[i]
      const y = (totalH - f.h) / 2
      placed[i] = mk(processed[i], xCursor, y, f)
      xCursor += f.w + gap
    }
  } else if (settings.layout === 'vertical') {
    totalW = Math.max(...fits.map((f) => f.w))
    totalH = fits.reduce((a, f) => a + f.h, 0) + gap * (n - 1)
    let yCursor = 0
    for (let i = 0; i < n; i++) {
      const f = fits[i]
      const x = (totalW - f.w) / 2
      placed[i] = mk(processed[i], x, yCursor, f)
      yCursor += f.h + gap
    }
  } else {
    // grid / nine-grid：固定列、逐格顺序落位，末行图片数不足列数时不补（右下方留白）
    const colW = new Array(cols).fill(0)
    const rowH = new Array(rows).fill(0)
    for (let i = 0; i < n; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      colW[c] = Math.max(colW[c], fits[i].w)
      rowH[r] = Math.max(rowH[r], fits[i].h)
    }
    totalW = colW.reduce((a, b) => a + b, 0) + gap * (cols - 1)
    totalH = rowH.reduce((a, b) => a + b, 0) + gap * (rows - 1)
    for (let i = 0; i < n; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      const f = fits[i]
      let xOff = 0
      for (let cc = 0; cc < c; cc++) xOff += colW[cc] + gap
      let yOff = 0
      for (let rr = 0; rr < r; rr++) yOff += rowH[rr] + gap
      const x = xOff + (colW[c] - f.w) / 2
      const y = yOff + (rowH[r] - f.h) / 2
      placed[i] = mk(processed[i], x, y, f)
    }
  }

  function mk(
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    f: { w: number; h: number; drawW: number; drawH: number }
  ): Placed {
    return { canvas, x, y, cellW: f.w, cellH: f.h, drawW: f.drawW, drawH: f.drawH }
  }

  // 最终画布尺寸
  const outW = settings.fixedOutput ? settings.fixedOutput.w : Math.max(1, Math.round(totalW))
  const outH = settings.fixedOutput ? settings.fixedOutput.h : Math.max(1, Math.round(totalH))
  const canvas = createCanvas(outW, outH)
  const ctx = canvas.getContext('2d')!

  // 固定输出时的整体偏移
  let offX = 0
  let offY = 0
  if (settings.fixedOutput) {
    if (settings.align === 'center') {
      offX = (outW - totalW) / 2
      offY = (outH - totalH) / 2
    }
  }

  drawBackground(ctx, outW, outH, settings.background, bgImage)

  // 阴影
  if (settings.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = Math.max(6, gap > 0 ? gap * 0.6 : 8)
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = Math.max(2, settings.shadow ? 3 : 0)
  }

  const radius = settings.cornerRadius
  for (const p of placed) {
    const x = p.x + offX
    const y = p.y + offY
    ctx.save()
    // 裁剪到格子（处理 cover 溢出 / 圆角）
    if (radius > 0) {
      roundRectPath(ctx, x, y, p.cellW, p.cellH, radius)
      ctx.clip()
    } else {
      ctx.beginPath()
      ctx.rect(x, y, p.cellW, p.cellH)
      ctx.clip()
    }
    const dx = x + (p.cellW - p.drawW) / 2
    const dy = y + (p.cellH - p.drawH) / 2
    ctx.drawImage(p.canvas, dx, dy, p.drawW, p.drawH)
    ctx.restore()

    // 边框
    if (settings.borderWidth > 0) {
      ctx.save()
      if (radius > 0) {
        roundRectPath(ctx, x, y, p.cellW, p.cellH, radius)
      } else {
        ctx.beginPath()
        ctx.rect(x, y, p.cellW, p.cellH)
      }
      ctx.lineWidth = settings.borderWidth
      ctx.strokeStyle = settings.borderColor
      ctx.stroke()
      ctx.restore()
    }
  }

  // 水印（无阴影）
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  drawWatermark(ctx, outW, outH, settings.watermark, watermarkImg)

  return canvas
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出失败'))),
      mime,
      quality
    )
  })
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 将画布（可能透明）铺白底后导出为 JPEG 字节，用于合成 PDF */
function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Uint8Array {
  const flat = createCanvas(canvas.width, canvas.height)
  const fctx = flat.getContext('2d')!
  fctx.fillStyle = '#ffffff'
  fctx.fillRect(0, 0, flat.width, flat.height)
  fctx.drawImage(canvas, 0, 0)
  const url = flat.toDataURL('image/jpeg', quality)
  return dataUrlToBytes(url)
}

/**
 * 生成最小单页 PDF（内嵌 JPEG 图像，铺满整页）。
 */
export function canvasToPdf(canvas: HTMLCanvasElement, quality = 0.92): Uint8Array {
  const jpeg = canvasToJpegBytes(canvas, quality)
  const w = canvas.width
  const h = canvas.height

  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  )
  const imgObj = `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`
  objects.push(imgObj)
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`
  objects.push(`<< /Length ${content.length} >>`)

  let pdf = '%PDF-1.3\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n`
    if (i === 3) {
      pdf += body + '\nstream\n'
      // 图像流以二进制追加
    } else if (i === 4) {
      pdf += body + '\nstream\n' + content + '\nendstream\n'
    } else {
      pdf += body + '\nendobj\n'
    }
  })
  // 重新以字节精确组装（含 JPEG 二进制）
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  let pos = 0
  const pushStr = (s: string) => {
    const b = enc.encode(s)
    parts.push(b)
    pos += b.length
  }
  pushStr('%PDF-1.3\n')
  const offs: number[] = []
  objects.forEach((body, i) => {
    offs.push(pos)
    pushStr(`${i + 1} 0 obj\n`)
    if (i === 3) {
      pushStr(body + '\nstream\n')
      parts.push(jpeg)
      pos += jpeg.length
      pushStr('\nendstream\nendobj\n')
    } else if (i === 4) {
      pushStr(body + '\nstream\n' + content + '\nendstream\nendobj\n')
    } else {
      pushStr(body + '\nendobj\n')
    }
  })
  // xref
  const xrefStart = pos
  let xref = `xref\n0 ${objects.length + 1}\n`
  xref += '0000000000 65535 f \n'
  for (const o of offs) {
    xref += String(o).padStart(10, '0') + ' 00000 n \n'
  }
  pushStr(xref)
  pushStr(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  return concatBytes(parts)
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}
