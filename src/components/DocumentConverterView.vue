<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft, FileText, FileDown, FileUp, Download, Image } from 'lucide-vue-next'
import { useToast } from '../hooks/useToast'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile, writeFile, mkdir } from '@tauri-apps/plugin-fs'
import DocumentFileUpload from './DocumentFileUpload.vue'
import Button from './ui/Button.vue'
import {
  wordToMarkdown,
  wordToHtml,
  type ConversionResult
} from '../tools/document-converter/word-converter'
import {
  pdfToMarkdown
} from '../tools/document-converter/pdf-converter'
import {
  markdownToWord
} from '../tools/document-converter/markdown-converter'
import { isDocFile, isDocxFile, validateFileSize } from '../tools/document-converter/index'

const emit = defineEmits<{
  back: []
}>()

const toast = useToast()

type ConversionType = 'word-to-markdown' | 'word-to-html' | 'pdf-to-markdown' | 'markdown-to-pdf' | 'markdown-to-word'

const selectedConversion = ref<ConversionType | null>(null)
const inputText = ref('')
const outputText = ref('')
const isProcessing = ref(false)
const progress = ref(0)
const showFileUpload = ref(false)
const conversionResult = ref<ConversionResult | null>(null)
const uploadedFile = ref<{ name: string; buffer: ArrayBuffer } | null>(null)

const conversions = [
  { id: 'word-to-markdown' as ConversionType, name: 'Word → Markdown', icon: '📝', description: '将 .docx 文件转换为 Markdown' },
  { id: 'word-to-html' as ConversionType, name: 'Word → HTML', icon: '🌐', description: '将 .docx 文件转换为 HTML' },
  { id: 'pdf-to-markdown' as ConversionType, name: 'PDF → Markdown', icon: '📄', description: '将 PDF 文件转换为 Markdown' },
  { id: 'markdown-to-pdf' as ConversionType, name: 'Markdown → PDF', icon: '📕', description: '将 Markdown 转换为 PDF' },
  { id: 'markdown-to-word' as ConversionType, name: 'Markdown → Word', icon: '📘', description: '将 Markdown 转换为 .docx' }
]

const acceptedFormats = computed(() => {
  if (selectedConversion.value?.startsWith('word-')) return '.docx'
  if (selectedConversion.value?.startsWith('pdf-')) return '.pdf'
  if (selectedConversion.value?.startsWith('markdown-')) return '.md,.markdown,.txt'
  return '*'
})

async function handleFileDrop(file: { name: string; buffer: ArrayBuffer; size: number }) {
  if (!validateFileSize(file.size)) {
    toast.error('文件大小超过 10MB 限制')
    return
  }

  if (selectedConversion.value?.startsWith('word-') && !isDocxFile(file.name)) {
    if (isDocFile(file.name)) {
      toast.error('不支持 .doc 格式，请先转换为 .docx')
    } else {
      toast.error('请选择 .docx 文件')
    }
    return
  }

  if (selectedConversion.value?.startsWith('pdf-') && !file.name.toLowerCase().endsWith('.pdf')) {
    toast.error('请选择 PDF 文件')
    return
  }

  if (selectedConversion.value?.startsWith('markdown-')) {
    const isMarkdown = file.name.toLowerCase().endsWith('.md') ||
                       file.name.toLowerCase().endsWith('.markdown') ||
                       file.name.toLowerCase().endsWith('.txt')
    if (!isMarkdown) {
      toast.error('请选择 Markdown 文件 (.md, .markdown, .txt)')
      return
    }
    // Read markdown content as text
    const text = new TextDecoder().decode(file.buffer)
    inputText.value = text
    uploadedFile.value = { name: file.name, buffer: file.buffer }
    toast.success(`已加载文件: ${file.name}`)
    return
  }

  uploadedFile.value = { name: file.name, buffer: file.buffer }
  await processFile(file.buffer)
}

async function processFile(buffer: ArrayBuffer) {
  if (!selectedConversion.value) return

  isProcessing.value = true
  progress.value = 0

  try {
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 100)

    switch (selectedConversion.value) {
      case 'word-to-markdown':
        conversionResult.value = await wordToMarkdown(buffer)
        outputText.value = conversionResult.value.markdown
        break
      case 'word-to-html':
        conversionResult.value = await wordToHtml(buffer)
        outputText.value = conversionResult.value.html
        break
      case 'pdf-to-markdown':
        const pdfResult = await pdfToMarkdown(buffer)
        outputText.value = pdfResult
        conversionResult.value = null
        break
    }

    clearInterval(progressInterval)
    progress.value = 100

    toast.success('转换完成')
  } catch (error) {
    toast.error(`转换失败: ${error}`)
  } finally {
    isProcessing.value = false
  }
}

async function handleConvert() {
  if (selectedConversion.value?.startsWith('markdown-')) {
    if (!inputText.value) {
      toast.error('请先上传 Markdown 文件')
      return
    }
    await processMarkdown()
  } else {
    showFileUpload.value = true
  }
}

async function processMarkdown() {
  if (!selectedConversion.value || !inputText.value) return

  isProcessing.value = true
  progress.value = 0

  try {
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 100)

    switch (selectedConversion.value) {
      case 'markdown-to-pdf':
        // Save as HTML file and let user open it to print
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Markdown to PDF</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 4px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f4f4f4; }
    @media print {
      body { max-width: none; }
    }
  </style>
</head>
<body>
${markdownToHtml(inputText.value)}
</body>
</html>`

        const filePath = await save({
          defaultPath: uploadedFile.value?.name?.replace(/\.[^/.]+$/, '') || 'document',
          filters: [
            { name: 'HTML', extensions: ['html'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })

        if (filePath) {
          await writeTextFile(filePath, htmlContent)
          toast.success(`HTML 已保存到: ${filePath}，请用浏览器打开后按 Ctrl+P 打印为 PDF`)
        }
        break

      case 'markdown-to-word':
        const blob = await markdownToWord(inputText.value)
        const wordFilePath = await save({
          defaultPath: uploadedFile.value?.name?.replace(/\.[^/.]+$/, '') || 'document',
          filters: [
            { name: 'Word', extensions: ['docx'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })

        if (wordFilePath) {
          const arrayBuffer = await blob.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          await writeFile(wordFilePath, bytes)
          toast.success(`Word 文档已保存到: ${wordFilePath}`)
        }
        break
    }

    clearInterval(progressInterval)
    progress.value = 100
  } catch (error) {
    toast.error(`转换失败: ${error}`)
  } finally {
    isProcessing.value = false
  }
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    // Unordered lists
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>')

  return `<p>${html}</p>`
}

async function saveMarkdown() {
  if (!conversionResult.value) return

  try {
    const filePath = await save({
      defaultPath: uploadedFile.value?.name?.replace(/\.[^/.]+$/, '') || 'document',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (filePath) {
      await writeTextFile(filePath, conversionResult.value.markdown)
      toast.success(`Markdown 已保存到: ${filePath}`)

      if (conversionResult.value.images.length > 0) {
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
        const imagesDir = `${dirPath}/images`

        try {
          await mkdir(imagesDir, { recursive: true })
        } catch {
          // Directory might already exist
        }

        for (const image of conversionResult.value.images) {
          const imagePath = `${imagesDir}/${image.name}`
          const binaryString = atob(image.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          await writeFile(imagePath, bytes)
        }

        toast.success(`图片已保存到: ${imagesDir}`)
      }
    }
  } catch (error) {
    toast.error(`保存失败: ${error}`)
  }
}

async function saveHtml() {
  if (!conversionResult.value) return

  try {
    const filePath = await save({
      defaultPath: uploadedFile.value?.name?.replace(/\.[^/.]+$/, '') || 'document',
      filters: [
        { name: 'HTML', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (filePath) {
      await writeTextFile(filePath, conversionResult.value.html)
      toast.success(`HTML 已保存到: ${filePath}`)

      if (conversionResult.value.images.length > 0) {
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
        const imagesDir = `${dirPath}/images`

        try {
          await mkdir(imagesDir, { recursive: true })
        } catch {
          // Directory might already exist
        }

        for (const image of conversionResult.value.images) {
          const imagePath = `${imagesDir}/${image.name}`
          const binaryString = atob(image.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          await writeFile(imagePath, bytes)
        }

        toast.success(`图片已保存到: ${imagesDir}`)
      }
    }
  } catch (error) {
    toast.error(`保存失败: ${error}`)
  }
}

function copyOutput() {
  navigator.clipboard.writeText(outputText.value)
  toast.success('已复制到剪贴板')
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
  selectedConversion.value = null
  showFileUpload.value = false
  conversionResult.value = null
  uploadedFile.value = null
}
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
        <span class="text-xl">📄</span>
        <div class="text-sm font-medium whitespace-nowrap">文档转换</div>
      </div>

      <div class="flex-1"></div>

      <Button
        v-if="selectedConversion"
        variant="ghost"
        size="sm"
        @click="clearAll"
      >
        清空
      </Button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Conversion Selection -->
      <div v-if="!selectedConversion" class="flex-1 p-4 overflow-auto">
        <h3 class="text-lg font-medium mb-4">选择转换类型</h3>
        <div class="grid grid-cols-1 gap-2">
          <button
            v-for="conv in conversions"
            :key="conv.id"
            @click="selectedConversion = conv.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary transition-colors text-left"
          >
            <span class="text-2xl">{{ conv.icon }}</span>
            <div>
              <div class="font-medium">{{ conv.name }}</div>
              <div class="text-sm text-muted-foreground">{{ conv.description }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Conversion Interface -->
      <template v-else>
        <!-- Progress Bar -->
        <div v-if="isProcessing" class="px-4 py-2">
          <div class="w-full bg-secondary rounded-full h-2">
            <div
              class="bg-primary h-2 rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <p class="text-xs text-muted-foreground mt-1">处理中... {{ progress }}%</p>
        </div>

        <!-- File Upload -->
        <div v-if="showFileUpload" class="flex-1 p-4">
          <DocumentFileUpload
            :accept="acceptedFormats"
            @file-drop="handleFileDrop"
          />
        </div>

        <!-- Markdown Preview (for markdown conversions) -->
        <div v-if="selectedConversion?.startsWith('markdown-') && inputText" class="flex-1 flex flex-col">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">Markdown 内容</span>
              <span class="text-xs text-muted-foreground">{{ uploadedFile?.name }}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              @click="handleConvert"
              :disabled="isProcessing"
            >
              <FileDown class="w-4 h-4 mr-1" />
              转换
            </Button>
          </div>
          <div class="flex-1 overflow-auto p-4">
            <pre class="text-sm font-mono whitespace-pre-wrap break-words">{{ inputText }}</pre>
          </div>
        </div>

        <!-- Output -->
        <div v-if="outputText" class="flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">输出结果</span>
              <span v-if="conversionResult?.images.length" class="text-xs text-muted-foreground">
                ({{ conversionResult.images.length }} 张图片)
              </span>
            </div>
            <div class="flex gap-1">
              <Button variant="ghost" size="sm" @click="copyOutput">
                <FileText class="w-4 h-4 mr-1" />
                复制
              </Button>
              <Button
                v-if="selectedConversion === 'word-to-markdown'"
                variant="ghost"
                size="sm"
                @click="saveMarkdown"
              >
                <Download class="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button
                v-if="selectedConversion === 'word-to-html'"
                variant="ghost"
                size="sm"
                @click="saveHtml"
              >
                <Download class="w-4 h-4 mr-1" />
                保存
              </Button>
            </div>
          </div>

          <!-- Images Preview -->
          <div v-if="conversionResult?.images.length" class="px-4 py-2 border-b border-border">
            <div class="flex items-center gap-2 mb-2">
              <Image class="w-4 h-4 text-muted-foreground" />
              <span class="text-sm font-medium">提取的图片</span>
            </div>
            <div class="flex gap-2 overflow-x-auto pb-2">
              <div
                v-for="(img, index) in conversionResult.images"
                :key="index"
                class="flex-shrink-0 w-20 h-20 rounded border border-border overflow-hidden"
              >
                <img
                  :src="`data:image/${img.type};base64,${img.data}`"
                  :alt="img.name"
                  class="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto">
            <pre class="p-4 text-sm font-mono whitespace-pre-wrap break-words">{{ outputText }}</pre>
          </div>
        </div>

        <!-- Select File Button -->
        <div v-if="!showFileUpload && !inputText && !outputText" class="p-4">
          <Button
            class="w-full"
            @click="showFileUpload = true"
          >
            <FileUp class="w-4 h-4 mr-2" />
            选择文件
          </Button>
          <p class="text-xs text-muted-foreground text-center mt-2">
            支持 {{ acceptedFormats }} 格式，最大 10MB
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
