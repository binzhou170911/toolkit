import type { Tool } from '../../types/tool'

function encodeBase64(input: string): string {
  try {
    return btoa(unescape(encodeURIComponent(input)))
  } catch (error) {
    throw new Error(`Encoding failed: ${error}`)
  }
}

function decodeBase64(input: string): string {
  try {
    return decodeURIComponent(escape(atob(input)))
  } catch (error) {
    throw new Error(`Decoding failed: ${error}`)
  }
}

function encodeBase64Url(input: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(input)))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (error) {
    throw new Error(`Encoding failed: ${error}`)
  }
}

function decodeBase64Url(input: string): string {
  try {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(escape(atob(base64)))
  } catch (error) {
    throw new Error(`Decoding failed: ${error}`)
  }
}

function detectBase64(input: string): number {
  const trimmed = input.trim()
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length > 4) {
    return 80
  }
  return 0
}

export const base64CodecTool: Tool = {
  id: 'base64-codec',
  name: 'Base64 编解码',
  description: 'Base64 编码和解码，支持文本和图片',
  icon: '🔤',
  category: '编码',
  keywords: ['base64', '编码', '解码', 'encode', 'decode'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'encode',
      name: '编码',
      execute: encodeBase64
    },
    {
      id: 'decode',
      name: '解码',
      execute: decodeBase64
    },
    {
      id: 'encode-url',
      name: 'URL 安全编码',
      execute: encodeBase64Url
    },
    {
      id: 'decode-url',
      name: 'URL 安全解码',
      execute: decodeBase64Url
    }
  ],
  detect: detectBase64
}
