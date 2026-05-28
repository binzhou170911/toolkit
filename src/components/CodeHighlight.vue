<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { codeToHtml } from 'shiki'

const props = defineProps<{
  code: string
  language?: string
  theme?: string
}>()

const html = ref('')
const isDark = ref(document.documentElement.classList.contains('dark'))

async function highlight() {
  try {
    html.value = await codeToHtml(props.code, {
      lang: props.language || 'json',
      theme: isDark.value ? 'github-dark' : 'github-light'
    })
  } catch {
    html.value = `<pre>${props.code}</pre>`
  }
}

watch(() => props.code, highlight)
watch(() => props.theme, highlight)

// Watch for theme changes
const observer = new MutationObserver(() => {
  isDark.value = document.documentElement.classList.contains('dark')
  highlight()
})

onMounted(() => {
  highlight()
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})
</script>

<template>
  <div
    class="rounded-lg overflow-auto text-sm font-mono [&_pre]:p-4 [&_pre]:m-0"
    v-html="html"
  />
</template>
