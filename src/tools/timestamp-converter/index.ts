import type { Tool } from '../../types/tool'

function timestampToDate(input: string): string {
  try {
    const timestamp = parseInt(input.trim())
    if (isNaN(timestamp)) throw new Error('Invalid timestamp')

    // Check if seconds or milliseconds
    const date = timestamp > 1000000000000
      ? new Date(timestamp)
      : new Date(timestamp * 1000)

    if (isNaN(date.getTime())) throw new Error('Invalid timestamp')

    return `日期: ${date.toLocaleDateString('zh-CN')}\n时间: ${date.toLocaleTimeString('zh-CN')}\nISO: ${date.toISOString()}\nUnix (秒): ${Math.floor(date.getTime() / 1000)}\nUnix (毫秒): ${date.getTime()}`
  } catch (error) {
    throw new Error(`时间戳转换失败: ${error}`)
  }
}

function dateToTimestamp(input: string): string {
  try {
    const date = new Date(input.trim())
    if (isNaN(date.getTime())) throw new Error('Invalid date')

    return `Unix (秒): ${Math.floor(date.getTime() / 1000)}\nUnix (毫秒): ${date.getTime()}\nISO: ${date.toISOString()}`
  } catch (error) {
    throw new Error(`日期转换失败: ${error}`)
  }
}

function currentTimestamp(): string {
  const now = new Date()
  return `当前时间: ${now.toLocaleString('zh-CN')}\nUnix (秒): ${Math.floor(now.getTime() / 1000)}\nUnix (毫秒): ${now.getTime()}\nISO: ${now.toISOString()}`
}

function detectTimestamp(content: string): number {
  const trimmed = content.trim()
  const num = parseInt(trimmed)

  if (isNaN(num)) return 0

  // Check if it looks like a timestamp
  // Seconds: 10 digits, starting with 1 (2001-2033)
  // Milliseconds: 13 digits, starting with 1
  if (/^\d{10}$/.test(trimmed) && num > 1000000000 && num < 2000000000) {
    return 85
  }
  if (/^\d{13}$/.test(trimmed) && num > 1000000000000 && num < 2000000000000) {
    return 90
  }

  return 0
}

export const timestampConverterTool: Tool = {
  id: 'timestamp-converter',
  name: '时间戳转换',
  description: '时间戳与日期互转',
  icon: '🕐',
  category: '工具',
  keywords: ['timestamp', '时间戳', 'date', '日期', 'unix', '时间'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'to-date',
      name: '转日期',
      execute: timestampToDate
    },
    {
      id: 'to-timestamp',
      name: '转时间戳',
      execute: dateToTimestamp
    },
    {
      id: 'current',
      name: '当前时间',
      execute: () => currentTimestamp()
    }
  ],
  detect: detectTimestamp
}
