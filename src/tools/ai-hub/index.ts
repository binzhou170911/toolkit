import type { Tool } from '../../types/tool'

export const aiHubTool: Tool = {
  id: 'ai-hub',
  name: 'AI 助手',
  description: 'ChatGPT、DeepSeek、Claude、通义千问等 AI 模型快捷访问',
  icon: '✨',
  category: 'AI',
  keywords: ['ai', 'gpt', 'chatgpt', 'openai', 'deepseek', 'claude', 'anthropic', '通义', '千问', 'tongyi', 'qwen', 'kimi', 'moonshot', '模型', 'assistant', '助手'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'open',
      name: '打开 AI 助手',
      execute: async (input: string) => {
        return input
      }
    }
  ]
}
