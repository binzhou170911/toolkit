import type { Tool } from '../../types/tool'

export const calculatorTool: Tool = {
  id: 'calculator',
  name: '计算器',
  description: '基础计算、科学计算、程序员计算、单位转换、日期计算、金融计算',
  icon: '🧮',
  category: '工具',
  keywords: ['calculator', '计算', '数学', '单位转换', '贷款', '利息'],
  inputType: 'text',
  outputType: 'text',
  actions: [
    {
      id: 'basic',
      name: '基础计算',
      execute: async (input: string) => {
        return input
      }
    },
    {
      id: 'scientific',
      name: '科学计算',
      execute: async (input: string) => {
        return input
      }
    },
    {
      id: 'programmer',
      name: '程序员计算',
      execute: async (input: string) => {
        return input
      }
    },
    {
      id: 'unit-converter',
      name: '单位转换',
      execute: async (input: string) => {
        return input
      }
    },
    {
      id: 'date-calculator',
      name: '日期计算',
      execute: async (input: string) => {
        return input
      }
    },
    {
      id: 'financial',
      name: '金融计算',
      execute: async (input: string) => {
        return input
      }
    }
  ],
  detect: (content: string) => {
    const trimmed = content.trim()
    // Detect simple math expressions
    if (/^[\d+\-*/().%\s]+$/.test(trimmed) && /[+\-*/]/.test(trimmed)) {
      return 70
    }
    return 0
  }
}
