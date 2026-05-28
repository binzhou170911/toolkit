## Why

用户需要在桌面工具应用中快速访问各大 AI 模型的网页版（ChatGPT、DeepSeek、Claude、通义千问等），目前只能通过浏览器手动打开。添加 AI Hub 功能可以将这些 AI 模型集中在一个入口，提升使用效率。同时需要支持用户自定义添加其他 AI 模型，方便扩展。

## What Changes

添加 AI Hub 工具，支持以下功能：

**内置模型**
- ChatGPT (chat.openai.com)
- DeepSeek (chat.deepseek.com)
- Claude (claude.ai)
- 通义千问 (tongyi.aliyun.com)

**核心功能**
- WebView 嵌入：每个模型使用独立 Tauri WebView 加载，保留登录状态
- 标签切换：顶部标签栏切换不同模型，show/hide 保留会话
- 窗口跟随：窗口大小变化时 WebView 自动调整位置和大小
- 用户自定义模型：支持手动添加/删除自定义 AI 模型，配置持久化到 localStorage
- 搜索集成：在首页搜索 "deepseek"、"claude" 等关键词可直接找到 AI Hub

**界面设计**
- 复用项目公共布局（Header + 返回按钮 + 标题 + 内容区）
- 标签栏显示模型图标和名称
- 添加模型对话框（名称、地址、图标）
- 刷新按钮、在浏览器中打开按钮

## Capabilities

### New Capabilities

- `ai-hub`: AI 模型快捷访问工具，支持 WebView 嵌入、标签切换、用户自定义模型

### Modified Capabilities

- `core:webview`: 添加 webview 创建、显示、隐藏等权限

## Impact

- **新增组件**：AIHubView
- **新增工具函数**：models.ts（模型配置 + localStorage 持久化）
- **新增依赖**：无（使用已有的 @tauri-apps/api/webview）
- **配置变更**：capabilities/default.json 添加 webview 权限
