## Context

Toolkit 是一个基于 Tauri 2.0 + Vue 3 的桌面工具应用，目前已实现 JSON、YAML、XML、Base64、二维码、Hash、文本编解码、时间戳等工具。现在需要添加文档格式转换功能，支持 Word、PDF、Markdown 之间的转换。

## Goals / Non-Goals

**Goals:**
- 支持 Word (.docx) 转换为 Markdown 和 HTML
- 支持 PDF 转换为 Markdown（智能识别基本格式）
- 支持 Markdown 转换为 PDF 和 Word
- 支持从 Word/PDF 中提取图片
- 大文件处理时显示进度条
- 文件大小限制（建议 10MB）

**Non-Goals:**
- 不支持旧版 .doc 格式（用户需先转换为 .docx）
- 不追求 PDF 的"完美排版"保留（接受智能识别 + 基本格式）
- 不支持扫描件 OCR（仅支持文本 PDF）

## Decisions

### 1. Word 处理方案

**选择：mammoth.js**

理由：
- 成熟的 .docx → HTML 转换库
- 支持标题、列表、表格、粗体、斜体等格式
- 可以提取图片（base64 或单独文件）
- 纯前端实现，无需后端依赖

替代方案：
- docx-parser：功能较弱
- 后端处理：增加复杂度

### 2. PDF 处理方案

**选择：pdf.js + 智能格式化**

理由：
- pdf.js 是 Mozilla 维护的 PDF 解析库
- 可以提取文本、字体、位置信息
- 通过字体大小识别标题
- 通过缩进识别列表

替代方案：
- pdf2md：效果不稳定
- 后端处理：增加依赖

### 3. Markdown → PDF 方案

**选择：浏览器打印方式**

理由：
- 使用 markdown-it 渲染 Markdown 为 HTML
- 通过 window.print() 生成 PDF
- 无需额外依赖
- 效果满足基本需求

替代方案：
- puppeteer：需要后端，增加复杂度
- markdown-pdf：效果一般

### 4. Markdown → Word 方案

**选择：HTML 中转方式**

理由：
- markdown-it 渲染 Markdown 为 HTML
- 使用 docx 库从 HTML 生成 .docx
- 流程清晰，效果可控

替代方案：
- 直接转换：库支持不完善

### 5. 文件处理方案

**选择：Web Worker + 进度反馈**

理由：
- 大文件处理会阻塞主线程
- Web Worker 可以异步处理
- 通过 postMessage 发送进度更新
- 用户体验好

替代方案：
- 同步处理：会卡顿
- 后端处理：增加复杂度

### 6. 图片提取方案

**选择：提取为 base64 或单独文件**

理由：
- Word 中的图片可以提取为 base64 内嵌
- 也可以选择提取为单独文件
- 用户可以根据需要选择

## Risks / Trade-offs

1. **PDF 格式识别准确度**
   - 风险：复杂排版的 PDF 可能识别不准确
   - 缓解：明确告知用户是"智能识别"，非完美保留

2. **大文件性能**
   - 风险：大文件处理可能较慢
   - 缓解：使用 Web Worker，添加进度条，设置文件大小限制

3. **依赖包大小**
   - 风险：mammoth.js、pdf.js 等库会增加包体积
   - 缓解：按需加载，使用动态 import

4. **浏览器打印 PDF 兼容性**
   - 风险：不同系统打印效果可能不同
   - 缓解：提供基本的打印样式，用户可自行调整

## Open Questions

1. 是否需要支持批量转换？
2. 图片提取的默认行为是什么（内嵌 vs 单独文件）？
3. 是否需要预览功能？
