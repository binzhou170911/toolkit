export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days)
}

export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return days[date.getDay()]
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

export function getToday(): string {
  return formatDate(new Date())
}
