export interface AIModel {
  id: string
  name: string
  icon: string
  logo?: string
  url: string
  description: string
  keywords: string[]
  color: string
  builtin: boolean
}

const BUILTIN_MODELS: AIModel[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔍',
    logo: '/ai-models/deepseek.svg',
    url: 'https://chat.deepseek.com',
    description: 'DeepSeek 深度求索',
    keywords: ['deepseek', '深度求索', 'deep'],
    color: '#4d6bfe',
    builtin: true
  },
  {
    id: 'tongyi',
    name: '通义千问',
    icon: '☁️',
    logo: '/ai-models/tongyi.svg',
    url: 'https://www.qianwen.com/',
    description: '阿里通义千问',
    keywords: ['tongyi', '通义', '千问', 'qwen'],
    color: '#6366f1',
    builtin: true
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '🤖',
    logo: '/ai-models/chatgpt.svg',
    url: 'https://chat.openai.com',
    description: 'OpenAI 对话模型',
    keywords: ['gpt', 'openai', 'chatgpt'],
    color: '#10a37f',
    builtin: true
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🧠',
    logo: '/ai-models/claude.svg',
    url: 'https://claude.ai',
    description: 'Anthropic Claude',
    keywords: ['claude', 'anthropic'],
    color: '#d97706',
    builtin: true
  }
]

const STORAGE_KEY = 'ai-hub-custom-models'

function loadCustomModels(): AIModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AIModel[]
  } catch {
    return []
  }
}

function saveCustomModels(models: AIModel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
}

export function getAllModels(): AIModel[] {
  return [...BUILTIN_MODELS, ...loadCustomModels()]
}

export function getBuiltinModels(): AIModel[] {
  return BUILTIN_MODELS
}

export function addCustomModel(model: Omit<AIModel, 'builtin'>): AIModel {
  const custom = loadCustomModels()
  const newModel: AIModel = { ...model, builtin: false }
  custom.push(newModel)
  saveCustomModels(custom)
  return newModel
}

export function removeCustomModel(id: string) {
  const custom = loadCustomModels().filter(m => m.id !== id)
  saveCustomModels(custom)
}

export function getAllKeywords(): string[] {
  const models = getAllModels()
  const keywords = new Set<string>()
  for (const m of models) {
    keywords.add(m.name.toLowerCase())
    keywords.add(m.id.toLowerCase())
    for (const kw of m.keywords) {
      keywords.add(kw.toLowerCase())
    }
  }
  return [...keywords]
}

export function findModelByQuery(query: string): AIModel | null {
  const lower = query.toLowerCase().trim()
  if (!lower) return null
  const models = getAllModels()
  for (const m of models) {
    if (m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower)) {
      return m
    }
    for (const kw of m.keywords) {
      if (kw.toLowerCase().includes(lower) || lower.includes(kw.toLowerCase())) {
        return m
      }
    }
  }
  return null
}
