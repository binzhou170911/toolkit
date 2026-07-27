import type { Tool } from '../../types/tool'

export const documentConverterTool: Tool = {
  id: 'document-converter',
  name: '文档转换',
  description: 'Word、PDF 转 Markdown（Pandoc / MinerU 双引擎，本地优先）',
  icon: '📄',
  category: '文档',
  keywords: [
    'word', 'pdf', 'markdown', 'docx', '文档', '转换', 'convert', 'pandoc', 'mineru'
  ],
  inputType: 'file',
  outputType: 'text',
  actions: [],
  detect: (content: string) => {
    const trimmed = content.trim()
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) return 80
    if (/\*\*.*\*\*/.test(trimmed)) return 60
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return 50
    return 0
  }
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
