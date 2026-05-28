## Why

用户需要在桌面工具应用中进行文档格式转换，这是开发者和内容创作者的常见需求。目前应用已支持 JSON、YAML、XML 等数据格式转换，但缺少对 Word、PDF、Markdown 等文档格式的支持。添加文档格式转换功能可以扩展应用场景，提升工具的实用性。

## What Changes

添加文档格式转换工具，支持以下转换方向：

- **Word → Markdown**：将 .docx 文件转换为 Markdown 格式（保留标题、列表、表格、粗体等）
- **Word → HTML**：将 .docx 文件转换为 HTML 格式
- **PDF → Markdown**：将 PDF 文件转换为 Markdown 格式（智能识别标题、段落、列表）
- **Markdown → PDF**：将 Markdown 文本转换为 PDF 文件（通过浏览器打印方式）
- **Markdown → Word**：将 Markdown 文本转换为 .docx 文件（HTML 中转）

通用功能：
- 图片提取：从 Word/PDF 中提取图片
- 文件大小限制：防止处理过大的文件
- 处理进度条：大文件处理时显示实时进度

## Capabilities

### New Capabilities

- `document-converter`: 文档格式转换工具，支持 Word、PDF、Markdown 之间的互相转换

### Modified Capabilities

无

## Impact

- **新增依赖**：mammoth.js (Word 处理)、pdf.js (PDF 处理)、turndown (HTML→Markdown)、docx (Markdown→Word)
- **新增组件**：DocumentConverterTool 组件
- **文件处理**：需要支持文件上传和下载
- **性能考虑**：大文件处理需要使用 Web Worker 异步处理
