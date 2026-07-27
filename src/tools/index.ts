import type { Tool } from '../types/tool'
import { useToolsStore } from '../store/tools'

// Import tools
import { jsonFormatterTool } from './json-formatter'
import { base64CodecTool } from './base64-codec'
import { qrcodeTool } from './qrcode-tool'
import { hashCalculatorTool } from './hash-calculator'
import { textCodecTool } from './text-codec'
import { timestampConverterTool } from './timestamp-converter'
import { documentConverterTool } from './document-converter'
import { calculatorTool } from './calculator'
import { aiHubTool } from './ai-hub'
import { colorPickerTool } from './color-picker'
import { gomokuTool } from './gomoku'
import { imageCombinerTool } from './image-combiner'

// Register all tools
export function registerAllTools() {
  const toolsStore = useToolsStore()

  const tools: Tool[] = [
    jsonFormatterTool,
    base64CodecTool,
    qrcodeTool,
    hashCalculatorTool,
    textCodecTool,
    timestampConverterTool,
    documentConverterTool,
    calculatorTool,
    aiHubTool,
    colorPickerTool,
    gomokuTool,
    imageCombinerTool
  ]

  tools.forEach(tool => toolsStore.registerTool(tool))
}

// Export individual tools
export {
  jsonFormatterTool,
  base64CodecTool,
  qrcodeTool,
  hashCalculatorTool,
  textCodecTool,
  timestampConverterTool,
  documentConverterTool,
  calculatorTool,
  aiHubTool,
  colorPickerTool,
  gomokuTool,
  imageCombinerTool
}
