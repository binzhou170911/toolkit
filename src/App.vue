<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { registerAllTools } from './tools'
import SearchView from './components/SearchView.vue'
import ToolView from './components/ToolView.vue'
import SettingsView from './components/SettingsView.vue'
import HistoryView from './components/HistoryView.vue'
import DocumentConverterView from './components/DocumentConverterView.vue'
import CalculatorView from './components/CalculatorView.vue'
import AIHubView from './components/AIHubView.vue'
import ColorPickerView from './components/ColorPickerView.vue'
import GomokuView from './components/GomokuView.vue'
import ImageCombinerView from './components/ImageCombinerView.vue'
import MagnifierView from './components/MagnifierView.vue'
import TitleBar from './components/TitleBar.vue'
import ToastContainer from './components/ToastContainer.vue'

// Detect if this is the magnifier window
const isMagnifier = window.location.hash === '#magnifier'

const currentView = ref<'search' | 'tool' | 'settings' | 'history' | 'document-converter' | 'calculator' | 'ai-hub' | 'color-picker' | 'gomoku' | 'image-combiner'>('search')
const selectedToolId = ref<string | null>(null)
const initialModelId = ref<string | undefined>(undefined)

function handleSelectTool(toolId: string, options?: { modelId?: string }) {
  if (toolId === 'document-converter') {
    currentView.value = 'document-converter'
  } else if (toolId === 'calculator') {
    currentView.value = 'calculator'
  } else if (toolId === 'ai-hub') {
    initialModelId.value = options?.modelId
    currentView.value = 'ai-hub'
  } else if (toolId === 'color-picker') {
    currentView.value = 'color-picker'
  } else if (toolId === 'gomoku') {
    currentView.value = 'gomoku'
  } else if (toolId === 'image-combiner') {
    currentView.value = 'image-combiner'
  } else {
    selectedToolId.value = toolId
    currentView.value = 'tool'
  }
}

function handleBackToSearch() {
  currentView.value = 'search'
  selectedToolId.value = null
}

function handleOpenSettings() {
  currentView.value = 'settings'
}

function handleOpenHistory() {
  currentView.value = 'history'
}

onMounted(() => {
  registerAllTools()
})
</script>

<template>
  <!-- Magnifier window -->
  <MagnifierView v-if="isMagnifier" />

  <!-- Normal app -->
  <div v-else class="h-screen flex flex-col text-foreground overflow-hidden rounded-xl border border-border animate-scale-in bg-background">
    <TitleBar
      @open-settings="handleOpenSettings"
      @open-history="handleOpenHistory"
    />
    <main class="flex-1 overflow-hidden">
      <transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-in"
        mode="out-in"
      >
        <SearchView
          v-if="currentView === 'search'"
          key="search"
          @select-tool="handleSelectTool"
        />
        <ToolView
          v-else-if="currentView === 'tool' && selectedToolId"
          key="tool"
          :tool-id="selectedToolId"
          @back="handleBackToSearch"
        />
        <DocumentConverterView
          v-else-if="currentView === 'document-converter'"
          key="document-converter"
          @back="handleBackToSearch"
        />
        <CalculatorView
          v-else-if="currentView === 'calculator'"
          key="calculator"
          @back="handleBackToSearch"
        />
        <AIHubView
          v-else-if="currentView === 'ai-hub'"
          key="ai-hub"
          :initial-model-id="initialModelId"
          @back="handleBackToSearch"
        />
        <ColorPickerView
          v-else-if="currentView === 'color-picker'"
          key="color-picker"
          @back="handleBackToSearch"
        />
        <GomokuView
          v-else-if="currentView === 'gomoku'"
          key="gomoku"
          @back="handleBackToSearch"
        />
        <ImageCombinerView
          v-else-if="currentView === 'image-combiner'"
          key="image-combiner"
          @back="handleBackToSearch"
        />
        <SettingsView
          v-else-if="currentView === 'settings'"
          key="settings"
          @back="handleBackToSearch"
        />
        <HistoryView
          v-else-if="currentView === 'history'"
          key="history"
          @back="handleBackToSearch"
          @select-tool="handleSelectTool"
        />
      </transition>
    </main>
    <ToastContainer />
  </div>
</template>
