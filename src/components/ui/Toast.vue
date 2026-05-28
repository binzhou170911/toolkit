<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-vue-next'

const props = defineProps<{
  type?: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(true)

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
}

const colors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500'
}

onMounted(() => {
  if (props.duration !== 0) {
    setTimeout(() => {
      isVisible.value = false
      emit('close')
    }, props.duration || 3000)
  }
})
</script>

<template>
  <transition
    enter-active-class="animate-slide-down"
    leave-active-class="animate-fade-in"
  >
    <div
      v-if="isVisible"
      class="flex items-center gap-3 p-3 rounded-lg border bg-background shadow-lg"
    >
      <component
        :is="icons[type || 'info']"
        :class="['w-4 h-4', colors[type || 'info']]"
      />
      <span class="text-sm flex-1">{{ message }}</span>
      <button
        @click="isVisible = false; emit('close')"
        class="p-0.5 rounded hover:bg-secondary transition-colors"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </transition>
</template>
