import type { Tool } from '../../types/tool'
import { wordToMarkdown, wordToHtml } from './word-converter'
import { pdfToMarkdown } from './pdf-converter'
import { markdownToPdf, markdownToWord } from './markdown-converter'

export const documentConverterTool: Tool = {
  id: 'document-converter',
  name: '文档转换',
  description: 'Word、PDF、Markdown 格式互转',
  icon: '📄',
  category: '文档',
  keywords: ['word', 'pdf', 'markdown', 'docx', '文档', '转换', 'convert'],
  inputType: 'file',
  outputType: 'text',
  actions: [
    {
      id: 'word-to-markdown',
      name: 'Word → Markdown',
      execute: async (input: string) => {
        // Input is base64 encoded file
        const arrayBuffer = base64ToArrayBuffer(input)
        const result = await wordToMarkdown(arrayBuffer)
        // Return JSON string with result and images info
        return JSON.stringify({
          content: result.markdown,
          images: result.images.map(img => ({
            name: img.name,
            data: img.data,
            type: img.type
          }))
        })
      }
    },
    {
      id: 'word-to-html',
      name: 'Word → HTML',
      execute: async (input: string) => {
        const arrayBuffer = base64ToArrayBuffer(input)
        const result = await wordToHtml(arrayBuffer)
        return JSON.stringify({
          content: result.html,
          images: result.images.map(img => ({
            name: img.name,
            data: img.data,
            type: img.type
          }))
        })
      }
    },
    {
      id: 'pdf-to-markdown',
      name: 'PDF → Markdown',
      execute: async (input: string) => {
        const arrayBuffer = base64ToArrayBuffer(input)
        const result = await pdfToMarkdown(arrayBuffer)
        return result
      }
    },
    {
      id: 'markdown-to-pdf',
      name: 'Markdown → PDF',
      execute: async (input: string) => {
        await markdownToPdf(input)
        return 'PDF generated. Check your browser print dialog.'
      }
    },
    {
      id: 'markdown-to-word',
      name: 'Markdown → Word',
      execute: async (input: string) => {
        const blob = await markdownToWord(input)
        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'document.docx'
        a.click()
        URL.revokeObjectURL(url)
        return 'Word document downloaded.'
      }
    }
  ],
  detect: (content: string) => {
    // Detect Markdown content
    const trimmed = content.trim()
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) return 80
    if (/\*\*.*\*\*/.test(trimmed)) return 60
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return 50
    return 0
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export function isDocFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.doc')
}

export function isDocxFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.docx')
}

export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  return size <= maxSizeMB * 1024 * 1024
}
