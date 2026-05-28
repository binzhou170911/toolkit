import type { Tool } from '../../types/tool'

function formatJson(input: string): string {
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

function minifyJson(input: string): string {
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

function validateJson(input: string): string {
  try {
    const parsed = JSON.parse(input)
    const type = Array.isArray(parsed) ? 'array' : typeof parsed
    const keys = type === 'object' ? Object.keys(parsed).length : 0
    return `✅ Valid JSON\nType: ${type}${keys > 0 ? `\nKeys: ${keys}` : ''}`
  } catch (error) {
    return `❌ Invalid JSON: ${error}`
  }
}

function jsonToYaml(input: string, options?: Record<string, any>): string {
  try {
    const indent = options?.indent || 2
    const parsed = JSON.parse(input)
    return convertToYaml(parsed, 0, indent)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

function convertToYaml(obj: any, level: number, indent: number): string {
  const spaces = ' '.repeat(level * indent)

  if (obj === null) return 'null'
  if (typeof obj === 'boolean') return obj.toString()
  if (typeof obj === 'number') return obj.toString()
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
      return `"${obj.replace(/"/g, '\\"')}"`
    }
    return obj
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map(item => {
      const yaml = convertToYaml(item, level + 1, indent)
      if (typeof item === 'object' && item !== null) {
        return `${spaces}- ${yaml.trimStart()}`
      }
      return `${spaces}- ${yaml}`
    }).join('\n')
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj)
    if (entries.length === 0) return '{}'
    return entries.map(([key, value]) => {
      const yaml = convertToYaml(value, level + 1, indent)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${spaces}${key}:\n${yaml}`
      }
      if (Array.isArray(value) && value.length > 0) {
        return `${spaces}${key}:\n${yaml}`
      }
      return `${spaces}${key}: ${yaml}`
    }).join('\n')
  }

  return String(obj)
}

function jsonToXml(input: string): string {
  try {
    const parsed = JSON.parse(input)
    return convertToXml(parsed, 'root', 0)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

function convertToXml(obj: any, tagName: string, level: number): string {
  const indent = '  '.repeat(level)

  if (obj === null || obj === undefined) {
    return `${indent}<${tagName}/>`
  }

  if (typeof obj !== 'object') {
    return `${indent}<${tagName}>${escapeXml(String(obj))}</${tagName}>`
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToXml(item, tagName, level)).join('\n')
  }

  const children = Object.entries(obj)
    .map(([key, value]) => convertToXml(value, key, level + 1))
    .join('\n')

  return `${indent}<${tagName}>\n${children}\n${indent}</${tagName}>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function extractKeys(input: string): string {
  try {
    const parsed = JSON.parse(input)
    const keys = extractAllKeys(parsed)
    return [...new Set(keys)].sort().join('\n')
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

function extractAllKeys(obj: any, prefix: string = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return []

  const keys: string[] = []

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      keys.push(...extractAllKeys(item, `${prefix}[${index}]`))
    })
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key
      keys.push(fullKey)
      keys.push(...extractAllKeys(value, fullKey))
    })
  }

  return keys
}

export const jsonFormatterTool: Tool = {
  id: 'json-formatter',
  name: 'JSON 处理',
  description: '格式化、压缩、验证、转换 JSON 数据',
  icon: '📋',
  category: '文本',
  keywords: ['json', '格式化', 'format', 'beautify', '压缩', 'minify', '验证', 'validate'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'format',
      name: '格式化',
      execute: formatJson
    },
    {
      id: 'minify',
      name: '压缩',
      execute: minifyJson
    },
    {
      id: 'validate',
      name: '验证',
      execute: validateJson
    },
    {
      id: 'to-yaml',
      name: '转 YAML',
      execute: jsonToYaml
    },
    {
      id: 'to-xml',
      name: '转 XML',
      execute: jsonToXml
    },
    {
      id: 'extract-keys',
      name: '提取 Keys',
      execute: extractKeys
    }
  ],
  detect: (content: string) => {
    try {
      const parsed = JSON.parse(content)
      // Only detect objects and arrays, not simple values like numbers, strings, booleans
      if (typeof parsed === 'object' && parsed !== null) {
        return 90
      }
      return 0
    } catch {
      return 0
    }
  }
}
