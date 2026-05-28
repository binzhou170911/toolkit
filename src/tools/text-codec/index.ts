import type { Tool } from '../../types/tool'

function urlEncode(input: string): string {
  return encodeURIComponent(input)
}

function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch (error) {
    throw new Error(`URL decode failed: ${error}`)
  }
}

function htmlEncode(input: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(input))
  return div.innerHTML
}

function htmlDecode(input: string): string {
  const div = document.createElement('div')
  div.innerHTML = input
  return div.textContent || ''
}

function unicodeEscape(input: string): string {
  return Array.from(input)
    .map(char => {
      const code = char.charCodeAt(0)
      if (code > 127) {
        return `\\u${code.toString(16).padStart(4, '0')}`
      }
      return char
    })
    .join('')
}

function unicodeUnescape(input: string): string {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
}

function textToHex(input: string): string {
  return Array.from(input)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
}

function hexToText(input: string): string {
  try {
    const hex = input.replace(/\s+/g, '')
    const bytes = hex.match(/.{1,2}/g) || []
    return bytes.map(byte => String.fromCharCode(parseInt(byte, 16))).join('')
  } catch (error) {
    throw new Error(`Hex decode failed: ${error}`)
  }
}

function unescapeText(input: string): string {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
}

function detectUrlEncoded(content: string): number {
  if (/%[0-9A-Fa-f]{2}/.test(content)) return 60
  return 0
}

function detectHex(content: string): number {
  const trimmed = content.trim()
  if (/^([0-9A-Fa-f]{2}\s*)+$/.test(trimmed) && trimmed.length > 2) return 70
  return 0
}

export const textCodecTool: Tool = {
  id: 'text-codec',
  name: '文本编解码',
  description: 'URL、HTML、Unicode、Hex 编解码',
  icon: '📝',
  category: '编码',
  keywords: ['url', 'html', 'unicode', 'hex', '编码', '解码', 'encode', 'decode', 'escape', 'unescape'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'url-encode',
      name: 'URL 编码',
      execute: urlEncode
    },
    {
      id: 'url-decode',
      name: 'URL 解码',
      execute: urlDecode
    },
    {
      id: 'html-encode',
      name: 'HTML 编码',
      execute: htmlEncode
    },
    {
      id: 'html-decode',
      name: 'HTML 解码',
      execute: htmlDecode
    },
    {
      id: 'unicode-escape',
      name: 'Unicode 转义',
      execute: unicodeEscape
    },
    {
      id: 'unicode-unescape',
      name: 'Unicode 反转义',
      execute: unicodeUnescape
    },
    {
      id: 'to-hex',
      name: '转 Hex',
      execute: textToHex
    },
    {
      id: 'from-hex',
      name: '从 Hex',
      execute: hexToText
    },
    {
      id: 'unescape',
      name: '反转义',
      execute: unescapeText
    }
  ],
  detect: (content: string) => {
    return Math.max(detectUrlEncoded(content), detectHex(content))
  }
}
