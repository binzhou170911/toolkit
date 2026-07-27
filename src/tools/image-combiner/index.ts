import type { Tool } from '../../types/tool'

export const imageCombinerTool: Tool = {
  id: 'image-combiner',
  name: '图片合成',
  description: '将多张图片横向、纵向或网格拼合为一张图片',
  icon: '🧩',
  category: '图片',
  keywords: ['图片合成', '拼图', '合并图片', '拼接', '图片拼接', 'image merge', 'combine', 'grid', 'collage'],
  inputType: 'image',
  outputType: 'image',
  actions: []
}
