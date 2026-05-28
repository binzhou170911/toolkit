const STORAGE_PREFIX = 'toolkit-'

export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to storage:', error)
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch (error) {
    console.error('Failed to remove from storage:', error)
  }
}
