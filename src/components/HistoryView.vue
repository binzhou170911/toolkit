<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Clock, Trash2, RotateCcw } from 'lucide-vue-next'
import { useHistoryStore } from '../store/history'
import { useToolsStore } from '../store/tools'
import Button from './ui/Button.vue'

const emit = defineEmits<{
  back: []
  'select-tool': [toolId: string]
}>()

const historyStore = useHistoryStore()
const toolsStore = useToolsStore()

const groupedEntries = computed(() => {
  const groups: Record<string, typeof historyStore.entries> = {}
  const now = new Date()

  historyStore.entries.forEach(entry => {
    const date = new Date(entry.timestamp)
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    let label: string
    if (diffDays === 0) {
      label = '今天'
    } else if (diffDays === 1) {
      label = '昨天'
    } else if (diffDays < 7) {
      label = `${diffDays} 天前`
    } else {
      label = date.toLocaleDateString('zh-CN')
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(entry)
  })

  return groups
})

function getToolName(toolId: string): string {
  const tool = toolsStore.tools.find(t => t.id === toolId)
  return tool?.name || toolId
}

function getToolIcon(toolId: string): string {
  const tool = toolsStore.tools.find(t => t.id === toolId)
  return tool?.icon || '🔧'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.substring(0, len) + '...'
}

function handleRerun(toolId: string) {
  emit('select-tool', toolId)
}

function handleClearHistory() {
  historyStore.clearHistory()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-4 border-b border-border">
      <div class="flex items-center gap-3">
        <button
          @click="emit('back')"
          class="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div class="text-sm font-medium">历史记录</div>
      </div>
      <button
        @click="handleClearHistory"
        class="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        title="清空历史"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="historyStore.entries.length === 0" class="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <Clock class="w-8 h-8 mb-2" />
        <p class="text-sm">暂无历史记录</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="(entries, label) in groupedEntries" :key="label">
          <h3 class="text-xs font-medium text-muted-foreground mb-2">{{ label }}</h3>
          <div class="space-y-1">
            <div
              v-for="entry in entries"
              :key="entry.id"
              class="p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span>{{ getToolIcon(entry.toolId) }}</span>
                  <span class="text-sm font-medium">{{ getToolName(entry.toolId) }}</span>
                </div>
                <span class="text-xs text-muted-foreground">{{ formatTime(entry.timestamp) }}</span>
              </div>
              <div class="text-xs text-muted-foreground mb-2">
                输入: {{ truncate(entry.input, 50) }}
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleRerun(entry.toolId)"
                >
                  <RotateCcw class="w-3 h-3 mr-1" />
                  重新执行
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
