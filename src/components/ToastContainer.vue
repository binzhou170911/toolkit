<script setup lang="ts">
import { useToast } from '../hooks/useToast'
import Toast from './ui/Toast.vue'

const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <Toast
      v-for="toast in toasts"
      :key="toast.id"
      :type="toast.type"
      :message="toast.message"
      @close="removeToast(toast.id)"
    />
  </div>
</template>
