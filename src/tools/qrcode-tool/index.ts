import type { Tool } from '../../types/tool'
import QRCode from 'qrcode'

async function generateQRCode(input: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(input, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    return dataUrl
  } catch (error) {
    throw new Error(`QR code generation failed: ${error}`)
  }
}

async function generateCustomQRCode(input: string): Promise<string> {
  try {
    const lines = input.split('\n').map(l => l.trim()).filter(l => l)
    const text = lines[0] || ''
    const color = lines[1] || '#000000'
    const bgColor = lines[2] || '#ffffff'
    const size = parseInt(lines[3]) || 256

    if (!text) {
      throw new Error('请输入二维码内容')
    }

    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: bgColor
      }
    })
    return dataUrl
  } catch (error) {
    throw new Error(`QR code generation failed: ${error}`)
  }
}

function detectUrl(content: string): number {
  try {
    const url = new URL(content.trim())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return 85
    }
  } catch {}
  return 0
}

export const qrcodeTool: Tool = {
  id: 'qrcode-tool',
  name: '二维码',
  description: '生成和解析二维码',
  icon: '📱',
  category: '图片',
  keywords: ['qr', 'qrcode', '二维码', '生成', '扫码'],
  inputType: 'text',
  outputType: 'image',
  actions: [
    {
      id: 'generate',
      name: '生成',
      execute: generateQRCode
    },
    {
      id: 'generate-custom',
      name: '自定义生成',
      execute: generateCustomQRCode
    }
  ],
  detect: detectUrl
}
