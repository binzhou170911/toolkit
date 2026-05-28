<script setup lang="ts">
import { ArrowLeft, Monitor, Moon, Sun, Clipboard } from 'lucide-vue-next'
import { useAppStore } from '../store/app'
import { useClipboard } from '../hooks/useClipboard'

const emit = defineEmits<{
  back: []
}>()

const appStore = useAppStore()
const { isMonitoring, toggleMonitoring } = useClipboard()

const themes = [
  { id: 'light' as const, name: '浅色', icon: Sun },
  { id: 'dark' as const, name: '深色', icon: Moon },
  { id: 'system' as const, name: '跟随系统', icon: Monitor }
]
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-3 p-4 border-b border-border">
      <button
        @click="emit('back')"
        class="p-1.5 rounded-lg hover:bg-secondary transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <div class="text-sm font-medium">设置</div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- Theme -->
      <div>
        <h3 class="text-sm font-medium mb-3">外观</h3>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="theme in themes"
            :key="theme.id"
            @click="appStore.setTheme(theme.id)"
            :class="[
              'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
              appStore.theme === theme.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-secondary'
            ]"
          >
            <component :is="theme.icon" class="w-5 h-5" />
            <span class="text-xs">{{ theme.name }}</span>
          </button>
        </div>
      </div>

      <!-- Clipboard -->
      <div>
        <h3 class="text-sm font-medium mb-3">智能推荐</h3>
        <div class="flex items-center justify-between p-3 rounded-lg border border-border">
          <div class="flex items-center gap-3">
            <Clipboard class="w-5 h-5" />
            <div>
              <div class="text-sm font-medium">智能监听</div>
              <div class="text-xs text-muted-foreground">自动检测内容并推荐工具</div>
            </div>
          </div>
          <button
            @click="toggleMonitoring"
            :class="[
              'relative w-11 h-6 rounded-full transition-colors',
              isMonitoring ? 'bg-primary' : 'bg-muted'
            ]"
          >
            <div
              :class="[
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                isMonitoring ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>
      </div>

      <!-- About -->
      <div>
        <h3 class="text-sm font-medium mb-3">关于</h3>
        <div class="p-3 rounded-lg border border-border">
          <div class="text-sm font-medium">Toolkit</div>
          <div class="text-xs text-muted-foreground">v1.0.0-alpha.1</div>
          <div class="text-xs text-muted-foreground mt-2">
            一个轻量级的桌面工具集合，支持各种文档格式转换、加密解密、二维码生成解析等功能。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
