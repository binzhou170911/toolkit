import { invoke } from '@tauri-apps/api/core'
import mammoth from 'mammoth'
import TurndownService from 'turndown'
// 使用 legacy 构建：Tauri/WKWebView 的 ESM worker 不支持 pdfjs v5 的
// ReadableStream 线程通信机制，会抛 "undefined is not a function (near
// readableStream)"。legacy 构建兼容旧运行时，且 worker 加载失败时能正确
// 回退到主线程 fake worker。
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
// 强制主线程 fake worker：pdfjs v5 的 ESM Worker 在 Tauri/WKWebView 下因
// ReadableStream 异步迭代（for await...of）缺失而崩溃；故项目降级到 v4
// （v4 使用 reader.read() 循环而非 for await...of readableStream），并显式把
// worker 模块挂到 globalThis.pdfjsWorker，使 PDFWorker 在 #initialize 时
// 直接走主线程解析，彻底规避 Web Worker 的跨线程 ReadableStream 兼容问题。
// worker 模块顶层仅挂 globalThis.pdfjsWorker 并导出 WorkerMessageHandler，
// 且只在真实 Worker 环境（无 window）才注册消息监听，故在主线程 import 安全。
import * as pdfWorkerModule from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
;(globalThis as any).pdfjsWorker = pdfWorkerModule

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

export interface EngineImage {
  name: string
  data: string // base64（无 data: 前缀）
  mime: string
}

export interface ConvertResult {
  markdown: string
  images: EngineImage[]
  engine: string
  warning?: string
}

let enginesCache: { pandoc: boolean; mineru: boolean; pymupdf: boolean } | null = null

export async function detectEngines(): Promise<{ pandoc: boolean; mineru: boolean; pymupdf: boolean }> {
  if (enginesCache) return enginesCache
  try {
    const r = await invoke<{ pandoc: boolean; mineru: boolean; pymupdf: boolean }>('detect_engines')
    enginesCache = r
    return r
  } catch {
    // 非 Tauri 环境（纯浏览器预览）直接降级
    enginesCache = { pandoc: false, mineru: false, pymupdf: false }
    return enginesCache
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j])
  }
  return btoa(binary)
}

/** Word → Markdown：优先 Pandoc，无则降级 mammoth */
export async function convertWordToMarkdown(file: {
  name: string
  buffer: ArrayBuffer
}): Promise<ConvertResult> {
  const engines = await detectEngines()
  if (engines.pandoc) {
    try {
      const r = await invoke<{ markdown: string; images: EngineImage[]; engine: string }>(
        'pandoc_to_markdown',
        { fileName: file.name, fileData: bufferToBase64(file.buffer) }
      )
      return r
    } catch (e) {
      console.warn('pandoc 调用失败，降级 mammoth：', e)
    }
  }
  return wordToMarkdownFallback(file.buffer)
}

async function wordToMarkdownFallback(buffer: ArrayBuffer): Promise<ConvertResult> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  const html = result.value || ''
  const images: EngineImage[] = []
  let processed = html
  const re = /src="(data:image\/([^;]+);base64,([^"]+))"/g
  let m: RegExpExecArray | null
  let i = 1
  while ((m = re.exec(html)) !== null) {
    const name = `image-${i}.${m[2]}`
    images.push({ name, data: m[3], mime: `image/${m[2]}` })
    processed = processed.replace(m[1], `images/${name}`)
    i++
  }
  const markdown = turndownService.turndown(processed)
  return {
    markdown,
    images,
    engine: 'mammoth',
    warning:
      '未检测到 Pandoc，使用 mammoth 降级转换。表格/样式保真度有限，建议安装 pandoc 获得最佳效果（brew install pandoc）。'
  }
}

/** PDF → Markdown：优先 MinerU，其次 PyMuPDF（真实矢量线段还原表格），最后 pdfjs 降级 */
export async function convertPdfToMarkdown(file: {
  name: string
  buffer: ArrayBuffer
}): Promise<ConvertResult> {
  const engines = await detectEngines()
  if (engines.mineru) {
    try {
      const r = await invoke<{ markdown: string; images: EngineImage[]; engine: string }>(
        'mineru_to_markdown',
        { fileName: file.name, fileData: bufferToBase64(file.buffer) }
      )
      return r
    } catch (e) {
      console.warn('mineru 调用失败，降级 PyMuPDF：', e)
    }
  }
  if (engines.pymupdf) {
    try {
      const r = await invoke<{ markdown: string; images: EngineImage[]; engine: string }>(
        'pymupdf_to_markdown',
        { fileName: file.name, fileData: bufferToBase64(file.buffer) }
      )
      return r
    } catch (e) {
      console.warn('pymupdf 调用失败，降级 pdfjs：', e)
    }
  }
  return pdfToMarkdownFallback(file.buffer)
}

interface PdfToken {
  str: string
  x: number
  y: number
  w: number
  h: number
}

// 1D 列中心聚类：把相近的 x 坐标合并为一个列中心，用于从文本位置推断表格列
function clusterColumns(xs: number[]): number[] {
  if (xs.length === 0) return []
  const sorted = [...xs].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1])
  const meanGap = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length)
  const thr = Math.max(20, meanGap * 1.8)
  const cols: number[] = []
  let group: number[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - group[group.length - 1] > thr) {
      cols.push(group.reduce((a, b) => a + b, 0) / group.length)
      group = [sorted[i]]
    } else {
      group.push(sorted[i])
    }
  }
  cols.push(group.reduce((a, b) => a + b, 0) / group.length)
  return cols
}

// 把一行的文本项分配到最近的列中心，返回每列拼接后的字符串（无内容则为 null）
function assignToColumns(
  row: PdfToken[],
  cols: number[],
  tol: number
): (string | null)[] {
  return cols.map((c) => {
    const inCol = row.filter((t) => Math.abs(t.x + t.w / 2 - c) <= tol)
    return inCol.length ? inCol.map((t) => t.str).join(' ') : null
  })
}

// 基于文本坐标重建版面：单栏文本沿用字号推断标题/段落；
// 连续多列对齐的行合并为 Markdown 表格。这是纯前端降级路径对规则表格的保真方案。
function layoutToMarkdown(tokens: PdfToken[]): string {
  if (tokens.length === 0) return ''
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)
  const maxH = Math.max(...sorted.map((t) => t.h))
  const lineGap = maxH * 0.6 + 1

  // 按 y 聚类分行（pdf y 从页面底部向上，越大越靠上）
  const rows: PdfToken[][] = []
  let cur: PdfToken[] = []
  let curY = sorted[0].y
  for (const t of sorted) {
    if (Math.abs(t.y - curY) > lineGap) {
      if (cur.length) rows.push(cur)
      cur = [t]
      curY = t.y
    } else {
      cur.push(t)
      curY = Math.max(curY, t.y)
    }
  }
  if (cur.length) rows.push(cur)

  const cols = clusterColumns(tokens.map((t) => t.x + t.w / 2))
  const colSpacing =
    cols.length > 1
      ? Math.min(...cols.slice(1).map((c, idx) => c - cols[idx])) / 2
      : Number.POSITIVE_INFINITY

  const out: string[] = []
  let tableBuf: (string | null)[][] = []

  const flushTable = () => {
    if (tableBuf.length === 0) return
    if (tableBuf.length === 1) {
      // 仅单行多列（多为误判），退化为普通文本
      out.push(`${tableBuf[0].map((c) => c ?? '').join(' ').trim()}\n\n`)
    } else {
      const n = tableBuf[0].length
      out.push('| ' + tableBuf[0].map((c) => c ?? '').join(' | ') + ' |\n')
      out.push('| ' + Array(n).fill('---').join(' | ') + ' |\n')
      for (let r = 1; r < tableBuf.length; r++) {
        out.push('| ' + tableBuf[r].map((c) => c ?? '').join(' | ') + ' |\n')
      }
      out.push('\n')
    }
    tableBuf = []
  }

  for (const row of rows) {
    const rowH = Math.max(...row.map((t) => t.h))
    const cells = assignToColumns(row, cols, colSpacing)
    const nonEmpty = cells.filter((c) => c && c.trim())
    const isMultiCol = nonEmpty.length >= 2
    const singleBig = row.length === 1 && rowH > 15

    if (isMultiCol && !singleBig) {
      tableBuf.push(cells)
      continue
    }
    flushTable()
    const text = row.map((t) => t.str).join(' ').trim()
    if (!text) continue
    if (rowH > 20) out.push(`# ${text}\n\n`)
    else if (rowH > 16) out.push(`## ${text}\n\n`)
    else if (rowH > 14) out.push(`### ${text}\n\n`)
    else if (
      text.startsWith('•') ||
      text.startsWith('-') ||
      text.startsWith('*') ||
      /^\d+\./.test(text)
    )
      out.push(`${text}\n`)
    else out.push(`${text}\n\n`)
  }
  flushTable()
  return out.join('')
}

async function pdfToMarkdownFallback(buffer: ArrayBuffer): Promise<ConvertResult> {
  // pdfjs v5 要求 data 为 Uint8Array；直接传 ArrayBuffer 会在 worker 传输底层
  // ArrayBuffer 时抛 "Buffer is already detached"。用 slice(0) 生成独立副本，
  // 既满足 TypedArray 入参约束，又避免外部 buffer 被提前转移（detached）。
  const data = new Uint8Array(buffer.slice(0))
  const pdf = await pdfjsLib.getDocument({ data }).promise
  let markdown = ''
  let totalChars = 0

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const tokens: PdfToken[] = textContent.items
      .map((it: any) => ({
        str: it.str || '',
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
        h: Math.abs(it.transform[3]) || 0,
      }))
      .filter((t) => t.str.trim().length > 0)

    const pageMd = layoutToMarkdown(tokens)
    markdown += pageMd
    totalChars += pageMd.replace(/\s/g, '').length
    if (i < pdf.numPages) markdown += '\n---\n\n'
  }

  const isScanned = totalChars < pdf.numPages * 50
  return {
    markdown: markdown.trim(),
    images: [],
    engine: 'pdfjs',
    warning: isScanned
      ? '该 PDF 疑似扫描件（文本极少），纯前端提取效果很差。建议安装 MinerU 获得高质量 OCR 转换（pip install mineru）。'
      : '未检测到 MinerU，使用 pdfjs 降级转换。表格已按文本坐标重建，公式/图片支持有限，建议安装 MinerU 获得最佳效果。'
  }
}
