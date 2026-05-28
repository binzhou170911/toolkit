import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function addToast(type: Toast['type'], message: string) {
    const id = crypto.randomUUID()
    toasts.value.push({ id, type, message })

    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function success(message: string) {
    addToast('success', message)
  }

  function error(message: string) {
    addToast('error', message)
  }

  function warning(message: string) {
    addToast('warning', message)
  }

  function info(message: string) {
    addToast('info', message)
  }

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast
  }
}
