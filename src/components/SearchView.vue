<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Star, Clock, ArrowRight, Clipboard } from 'lucide-vue-next'
import { useToolsStore } from '../store/tools'
import { useClipboard } from '../hooks/useClipboard'
import { findModelByQuery } from '../tools/ai-hub/models'
import Fuse from 'fuse.js'
import Input from './ui/Input.vue'
import ToolCard from './ToolCard.vue'

const emit = defineEmits<{
  'select-tool': [toolId: string, options?: { modelId?: string }]
}>()

const toolsStore = useToolsStore()
const { recommendations } = useClipboard()
const searchQuery = ref('')
const selectedIndex = ref(0)

const fuse = computed(() => new Fuse(toolsStore.tools, {
  keys: ['name', 'description', 'keywords'],
  threshold: 0.3
}))

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  return fuse.value.search(searchQuery.value).map(result => result.item)
})

const displayTools = computed(() => {
  if (searchQuery.value) return searchResults.value
  return []
})

const showDefaultView = computed(() => !searchQuery.value)

function getOptionsForTool(toolId: string): { modelId?: string } | undefined {
  if (toolId === 'ai-hub' && searchQuery.value) {
    const model = findModelByQuery(searchQuery.value)
    if (model) return { modelId: model.id }
  }
  return undefined
}

function handleKeyDown(event: KeyboardEvent) {
  const tools = displayTools.value
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, tools.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      event.preventDefault()
      if (tools[selectedIndex.value]) {
        const toolId = tools[selectedIndex.value].id
        emit('select-tool', toolId, getOptionsForTool(toolId))
      }
      break
    case 'Escape':
      event.preventDefault()
      searchQuery.value = ''
      selectedIndex.value = 0
      break
  }
}

function handleSelectTool(toolId: string) {
  toolsStore.addRecent(toolId)
  emit('select-tool', toolId, getOptionsForTool(toolId))
}

onMounted(() => {
  setTimeout(() => {
    const input = document.querySelector('input')
    input?.focus()
  }, 100)
})
</script>

<template>
  <div class="flex flex-col h-full" @keydown="handleKeyDown">
    <div class="p-4 pb-2">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="搜索工具..."
          class="pl-9 h-11 text-base"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <!-- Default View: Favorites + Recent -->
      <div v-if="showDefaultView" class="space-y-4">
        <!-- Clipboard Recommendations -->
        <div v-if="recommendations.length > 0">
          <div class="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Clipboard class="w-4 h-4" />
            <span>智能推荐</span>
          </div>
          <div class="space-y-1">
            <button
              v-for="rec in recommendations"
              :key="rec.tool.id"
              @click="handleSelectTool(rec.tool.id)"
              class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="text-lg">{{ rec.tool.icon }}</span>
                <div class="text-left">
                  <div class="text-sm font-medium">{{ rec.tool.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ rec.action.name }}</div>
                </div>
              </div>
              <ArrowRight class="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <!-- Favorites -->
        <div v-if="toolsStore.favoriteTools.length > 0">
          <div class="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Star class="w-4 h-4" />
            <span>收藏</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <ToolCard
              v-for="tool in toolsStore.favoriteTools"
              :key="tool.id"
              :tool="tool"
              @click="handleSelectTool(tool.id)"
            />
          </div>
        </div>

        <!-- Recent Tools -->
        <div v-if="toolsStore.recentToolsList.length > 0">
          <div class="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Clock class="w-4 h-4" />
            <span>最近使用</span>
          </div>
          <div class="space-y-1">
            <button
              v-for="tool in toolsStore.recentToolsList"
              :key="tool.id"
              @click="handleSelectTool(tool.id)"
              class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="text-lg">{{ tool.icon }}</span>
                <div class="text-left">
                  <div class="text-sm font-medium">{{ tool.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ tool.description }}</div>
                </div>
              </div>
              <ArrowRight class="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="recommendations.length === 0 && toolsStore.favoriteTools.length === 0 && toolsStore.recentToolsList.length === 0"
          class="flex flex-col items-center justify-center h-40 text-muted-foreground"
        >
          <Search class="w-8 h-8 mb-2" />
          <p class="text-sm">输入关键词搜索工具</p>
        </div>
      </div>

      <!-- Search Results -->
      <div v-else class="space-y-1">
        <div v-if="displayTools.length === 0" class="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <p class="text-sm">未找到匹配的工具</p>
        </div>
        <button
          v-for="(tool, index) in displayTools"
          :key="tool.id"
          @click="handleSelectTool(tool.id)"
          :class="[
            'flex items-center justify-between w-full p-3 rounded-lg transition-colors',
            index === selectedIndex ? 'bg-secondary' : 'hover:bg-secondary/50'
          ]"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">{{ tool.icon }}</span>
            <div class="text-left">
              <div class="text-sm font-medium">{{ tool.name }}</div>
              <div class="text-xs text-muted-foreground">{{ tool.description }}</div>
            </div>
          </div>
          <span class="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
            {{ tool.category }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
