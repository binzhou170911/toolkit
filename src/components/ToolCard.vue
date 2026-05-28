<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import { useToolsStore } from '../store/tools'
import type { Tool } from '../types/tool'

const props = defineProps<{
  tool: Tool
}>()

const emit = defineEmits<{
  click: []
}>()

const toolsStore = useToolsStore()

function toggleFavorite(event: Event) {
  event.stopPropagation()
  toolsStore.toggleFavorite(props.tool.id)
}

const isFavorite = computed(() => toolsStore.favorites.includes(props.tool.id))
</script>

<template>
  <button
    @click="emit('click')"
    class="relative p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors text-left"
  >
    <div
      @click="toggleFavorite"
      class="absolute top-2 right-2 p-1 rounded hover:bg-secondary transition-colors cursor-pointer"
    >
      <Star
        :class="[
          'w-3.5 h-3.5',
          isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
        ]"
      />
    </div>
    <div class="text-2xl mb-2">{{ tool.icon }}</div>
    <div class="text-sm font-medium">{{ tool.name }}</div>
    <div class="text-xs text-muted-foreground line-clamp-2">{{ tool.description }}</div>
  </button>
</template>
