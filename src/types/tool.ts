export interface ToolAction {
  id: string
  name: string
  icon?: string
  execute: (input: string, options?: Record<string, any>) => Promise<string> | string
}

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  category: string
  keywords: string[]
  inputType: 'text' | 'file' | 'image'
  outputType: 'text' | 'file' | 'image'
  actions: ToolAction[]
  detect?: (content: string) => number
}

export interface ClipboardRecommendation {
  tool: Tool
  action: ToolAction
  score: number
}
