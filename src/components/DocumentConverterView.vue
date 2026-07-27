<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft, Download, X, Copy, AlertCircle } from 'lucide-vue-next'
import { useToast } from '../hooks/useToast'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { desktopDir, homeDir } from '@tauri-apps/api/path'
import { writeTextFile, writeFile, mkdir } from '@tauri-apps/plugin-fs'
import DocumentFileUpload from './DocumentFileUpload.vue'
import Button from './ui/Button.vue'
import { validateFileSize } from '../tools/document-converter/index'
import {
  convertWordToMarkdown,
  convertPdfToMarkdown,
  type ConvertResult
} from '../tools/document-converter/engines'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const emit = defineEmits<{ back: [] }>()
const toast = useToast()

const md = new MarkdownIt({ html: true, breaks: true, linkify: true })
md.use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false } })

type SourceType = 'docx' | 'pdf' | 'md'
type TargetId = 'markdown' | 'html' | 'pdf' | 'word'
interface Target {
  id: TargetId
  label: string
  ext: string
}

const file = ref<{ name: string; buffer: ArrayBuffer; size: number } | null>(null)
const selectedTarget = ref<TargetId | null>(null)
const isProcessing = ref(false)
const result = ref<ConvertResult | null>(null)
const engineLabel = ref('')
// 最近一次成功保存的文件路径，用于「打开文件位置」
const savedPath = ref('')
// 保存目标：文件夹名（可改）+ 父目录（默认桌面，可浏览修改）
// MD 与 media 图片都落在 <父目录>/<文件夹名>/ 下，保证两者同目录。
const saveFolderName = ref('')
const saveParentDir = ref('')
// 解析出的完整保存目录（用于界面展示）
const resolvedSaveDir = computed(() => {
  const name = saveFolderName.value || file.value?.name.replace(/\.[^/.]+$/, '') || 'document'
  const parent = saveParentDir.value || '桌面（默认）'
  return `${parent}/${name}`
})

function sourceTypeFromName(name: string): SourceType | null {
  const n = name.toLowerCase()
  if (n.endsWith('.docx')) return 'docx'
  if (n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.md') || n.endsWith('.markdown') || n.endsWith('.txt')) return 'md'
  return null
}

const sourceType = computed<SourceType | null>(() =>
  file.value ? sourceTypeFromName(file.value.name) : null
)
const sourceLabel = computed(() => {
  const s = sourceType.value
  return s === 'docx' ? 'Word' : s === 'pdf' ? 'PDF' : s === 'md' ? 'Markdown' : ''
})

const availableTargets = computed<Target[]>(() => {
  const s = sourceType.value
  if (s === 'docx' || s === 'pdf') {
    return [
      { id: 'markdown', label: 'Markdown', ext: 'md' },
      { id: 'html', label: 'HTML', ext: 'html' }
    ]
  }
  if (s === 'md') {
    return [
      { id: 'pdf', label: 'PDF', ext: 'pdf' },
      { id: 'word', label: 'Word', ext: 'docx' }
    ]
  }
  return []
})

const currentExt = computed(
  () => availableTargets.value.find((t) => t.id === selectedTarget.value)?.ext || 'txt'
)

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 从 MD 文本里找出某张图片被引用的相对目录（如 "media"），
// 确保保存图片时落盘路径与 MD 引用路径一致，避免图片丢失。
// PyMuPDF / Pandoc 均使用 media/，这里动态解析以兼容不同引擎。
function imageRefDir(text: string, name: string): string {
  const esc = escapeRegExp(name)
  const m = text.match(new RegExp(`\\]\\(([^)]*?)${esc}\\)`))
  if (!m) return ''
  const p = m[1].replace(/^\.\//, '') // 去掉前导 ./
  const slash = p.lastIndexOf('/')
  return slash >= 0 ? p.slice(0, slash) : ''
}

// 把 MD 里的图片相对路径替换为 data URL（用于预览与复制内嵌版）
function inlineImages(text: string, images: ConvertResult['images']): string {
  let out = text
  for (const img of images) {
    const esc = escapeRegExp(img.name)
    out = out.replace(
      new RegExp(`\\]\\(([^)]*?/${esc})\\)`, 'g'),
      `](data:${img.mime};base64,${img.data})`
    )
  }
  return out
}

const inlinedMarkdown = computed(() =>
  result.value ? inlineImages(result.value.markdown, result.value.images) : ''
)

const previewHtml = computed(() => {
  if (!result.value) return ''
  return md.render(inlinedMarkdown.value)
})

const outputText = computed(() => {
  if (!result.value) return ''
  if (selectedTarget.value === 'html') return md.render(inlinedMarkdown.value)
  return inlinedMarkdown.value
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function handleFileDrop(f: { name: string; buffer: ArrayBuffer; size: number }) {
  if (!validateFileSize(f.size)) {
    toast.error('文件大小超过 10MB 限制')
    return
  }
  const src = sourceTypeFromName(f.name)
  if (!src) {
    toast.error('不支持的格式，请选择 .docx / .pdf / .md')
    return
  }
  file.value = f
  selectedTarget.value = null
  result.value = null
  engineLabel.value = ''
  savedPath.value = ''
  // 默认文件夹名 = 源文件名（去扩展名），用户可在保存面板中修改
  saveFolderName.value = f.name.replace(/\.[^/.]+$/, '') || 'document'
  toast.success(`已识别：${src === 'docx' ? 'Word' : src === 'pdf' ? 'PDF' : 'Markdown'}`)
}

async function selectTarget(t: TargetId) {
  selectedTarget.value = t
  if (!file.value) return
  const src = sourceType.value
  if (src === 'md') return // 反向转换暂为占位
  if (result.value) return // 已转换，复用结果切换目标
  isProcessing.value = true
  try {
    const r =
      src === 'docx'
        ? await convertWordToMarkdown(file.value)
        : await convertPdfToMarkdown(file.value)
    result.value = r
    engineLabel.value = r.engine
  } catch (e) {
    toast.error(`转换失败：${e}`)
  } finally {
    isProcessing.value = false
  }
}

function removeFile() {
  file.value = null
  selectedTarget.value = null
  result.value = null
  engineLabel.value = ''
  savedPath.value = ''
  saveFolderName.value = ''
}

async function copyOutput() {
  const text = outputText.value
  if (!text) return
  await navigator.clipboard.writeText(text)
  toast.success('已复制到剪贴板')
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 浏览选择保存的父目录（默认桌面） */
async function pickParentDir() {
  try {
    const selected = await open({
      directory: true,
      title: '选择保存位置',
      defaultPath: saveParentDir.value || undefined
    })
    if (typeof selected === 'string') {
      saveParentDir.value = selected
    }
  } catch (e) {
    toast.error(`选择位置失败：${e}`)
  }
}

/** 文件夹式保存：MD 与 media 图片都落在 <父目录>/<文件夹名>/ 下 */
async function saveOutput() {
  if (!result.value || !file.value) return
  // 文件夹名：去除非法字符（/ \），默认源文件名
  const folderName = (saveFolderName.value || file.value.name.replace(/\.[^/.]+$/, '') || 'document')
    .trim()
    .replace(/[\/\\]/g, '_')
  if (!folderName) {
    toast.error('请填写输出文件夹名称')
    return
  }
  // 父目录：用户已选则用之，否则默认桌面
  let parent = saveParentDir.value
  if (!parent) {
    try {
      parent = await desktopDir()
    } catch {
      try {
        parent = await homeDir()
      } catch {
        parent = ''
      }
    }
    saveParentDir.value = parent
  }
  if (!parent) {
    toast.error('无法确定默认保存位置，请点击「选择位置」指定目录')
    return
  }
  const outDir = `${parent}/${folderName}`
  const ext = currentExt.value
  try {
    // 递归创建输出文件夹（已存在不报错）
    await mkdir(outDir, { recursive: true })
    if (selectedTarget.value === 'html') {
      const mdPath = `${outDir}/${folderName}.${ext}`
      await writeTextFile(mdPath, md.render(inlinedMarkdown.value))
      savedPath.value = mdPath
      toast.success(`已保存：${mdPath}`)
    } else {
      const mdPath = `${outDir}/${folderName}.${ext}`
      // markdown：写 MD（相对路径版）+ 图片目录
      // 关键：图片必须落盘到 MD 实际引用的相对目录（如 media/），
      // 否则打开 MD 时相对路径解析不到图片，只剩文字路径。
      await writeTextFile(mdPath, result.value.markdown)
      for (const img of result.value.images) {
        const relDir = imageRefDir(result.value.markdown, img.name)
        const imgDir = relDir ? `${outDir}/${relDir}` : outDir
        // 递归创建图片目录（recursive 容错：目录已存在不报错）
        await mkdir(imgDir, { recursive: true }).catch(() => {})
        await writeFile(`${imgDir}/${img.name}`, base64ToUint8(img.data))
      }
      const extra = result.value.images.length ? `（含 ${result.value.images.length} 张图片）` : ''
      savedPath.value = mdPath
      toast.success(`已保存：${outDir}${extra}`)
    }
  } catch (e) {
    toast.error(`保存失败：${e}`)
  }
}

/** 在系统文件管理器中定位并选中最近一次保存的文件 */
async function openSavedLocation() {
  if (!savedPath.value) return
  try {
    await invoke('reveal_in_file_manager', { path: savedPath.value })
  } catch (e) {
    toast.error(`打开文件位置失败：${e}`)
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <!-- Header -->
    <div class="flex items-center gap-2 p-3 border-b border-border">
      <button
        @click="emit('back')"
        class="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <span class="text-xl">📄</span>
      <div class="text-sm font-medium whitespace-nowrap">文档转换</div>
      <div class="flex-1"></div>
      <Button v-if="file" variant="ghost" size="sm" @click="removeFile">清空</Button>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      <!-- 无文件：拖拽区 -->
      <div v-if="!file" class="flex-1 flex flex-col justify-center">
        <DocumentFileUpload @file-drop="handleFileDrop" />
        <p class="text-xs text-muted-foreground text-center mt-2">
          拖入文件，自动识别格式 · 支持 .docx .pdf .md
        </p>
        <p class="text-xs text-muted-foreground/70 text-center mt-1">
          本机装 Pandoc / MinerU 自动启用高质量引擎，否则降级纯前端
        </p>
      </div>

      <!-- 有文件 -->
      <template v-else>
        <!-- 已选文件行 -->
        <div class="flex items-center gap-3 p-3 rounded-lg border border-border">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">{{ sourceLabel }} · {{ formatSize(file.size) }}</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">已识别</span>
          <button
            @click="removeFile"
            class="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 目标选择 -->
        <div>
          <p class="text-sm font-medium mb-2">转换为</p>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="t in availableTargets"
              :key="t.id"
              @click="selectTarget(t.id)"
              :class="[
                'px-4 py-2 rounded-lg border text-sm transition-colors',
                selectedTarget === t.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-secondary'
              ]"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 结果 -->
        <div
          v-if="selectedTarget"
          class="flex-1 flex flex-col min-h-0 border border-border rounded-lg overflow-hidden"
        >
          <div class="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <span class="text-sm font-medium">转换结果</span>
            <span class="text-xs text-muted-foreground">引擎：{{ engineLabel || '待接入' }}</span>
          </div>

          <!-- 引擎降级提示 -->
          <div
            v-if="result?.warning"
            class="flex items-start gap-2 px-3 py-2 bg-amber-50 text-xs text-amber-700 border-b border-amber-200"
          >
            <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{{ result.warning }}</span>
          </div>

          <!-- 处理中 -->
          <div
            v-if="isProcessing"
            class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
          >
            正在转换，请稍候...
          </div>

          <!-- 渲染预览 -->
          <div
            v-else-if="result && (selectedTarget === 'markdown' || selectedTarget === 'html')"
            class="md-preview flex-1 overflow-auto p-4"
            v-html="previewHtml"
          ></div>

          <!-- 占位（md→pdf/word） -->
          <div
            v-else
            class="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4 text-center"
          >
            <template v-if="sourceType === 'md'">
              Markdown → PDF/Word 反向转换暂为占位<br />（本次聚焦 PDF/Word → Markdown）
            </template>
            <template v-else>等待转换...</template>
          </div>

          <!-- 保存设置：MD 与 media 同目录，默认桌面，文件夹名可改 -->
          <div class="flex flex-col gap-2 px-3 py-2 border-t border-border bg-muted/20">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground whitespace-nowrap">输出文件夹</span>
              <input
                v-model="saveFolderName"
                class="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-primary"
                placeholder="文件夹名称"
              />
              <Button variant="ghost" size="sm" @click="pickParentDir">选择位置</Button>
            </div>
            <p class="text-xs text-muted-foreground truncate" :title="resolvedSaveDir">
              保存到：{{ resolvedSaveDir }}
            </p>
          </div>

          <!-- 操作 -->
          <div class="flex gap-2 px-3 py-2 border-t border-border">
            <Button variant="ghost" size="sm" @click="copyOutput" :disabled="!result">
              <Copy class="w-4 h-4 mr-1" />
              复制
            </Button>
            <Button variant="ghost" size="sm" @click="saveOutput" :disabled="!result">
              <Download class="w-4 h-4 mr-1" />
              保存文档
            </Button>
            <Button
              v-if="savedPath"
              variant="ghost"
              size="sm"
              @click="openSavedLocation"
              title="在文件管理器中定位保存的文件"
            >
              <ArrowLeft class="w-4 h-4 mr-1 rotate-180" />
              打开文件位置
            </Button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.md-preview :deep(h1) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
}
.md-preview :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.7em 0 0.35em;
}
.md-preview :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}
.md-preview :deep(p) {
  margin: 0.5em 0;
  line-height: 1.7;
}
.md-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
  font-size: 0.875rem;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid var(--color-border-tertiary);
  padding: 4px 8px;
  text-align: left;
}
.md-preview :deep(th) {
  background: var(--color-background-secondary);
  font-weight: 500;
}
.md-preview :deep(code) {
  background: var(--color-background-secondary);
  padding: 1px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.md-preview :deep(pre) {
  background: var(--color-background-secondary);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.6em 0;
}
.md-preview :deep(pre code) {
  background: none;
  padding: 0;
}
.md-preview :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 0.5em 0;
}
.md-preview :deep(blockquote) {
  border-left: 3px solid var(--color-border-tertiary);
  padding-left: 12px;
  color: var(--color-text-secondary);
  margin: 0.6em 0;
}
.md-preview :deep(ul),
.md-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.md-preview :deep(a) {
  color: var(--color-text-info);
  text-decoration: underline;
}
</style>
