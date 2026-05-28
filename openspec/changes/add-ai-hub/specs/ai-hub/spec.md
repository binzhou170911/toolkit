## Overview

AI Hub 是一个 AI 模型快捷访问工具，通过 Tauri WebView 嵌入各大 AI 模型的网页版，提供统一的入口和标签切换界面。

## Interface

### Tool 定义

```typescript
{
  id: 'ai-hub',
  name: 'AI 助手',
  description: 'ChatGPT、DeepSeek、Claude、通义千问等 AI 模型快捷访问',
  icon: '🤖',
  category: 'AI',
  keywords: ['ai', 'gpt', 'chatgpt', 'openai', 'deepseek', 'claude', 'anthropic', '通义', '千问', 'tongyi', 'qwen', 'kimi', 'moonshot', '模型', 'assistant', '助手'],
  inputType: 'text',
  outputType: 'text',
  actions: [{ id: 'open', name: '打开 AI 助手' }]
}
```

### AIModel 接口

```typescript
interface AIModel {
  id: string          // 唯一标识
  name: string        // 显示名称
  icon: string        // emoji 图标
  url: string         // 网页地址
  description: string // 描述
  keywords: string[]  // 搜索关键词
  color: string       // 主题色
  builtin: boolean    // 是否内置
}
```

### 内置模型

| 模型 | ID | URL | 图标 |
|------|-----|-----|------|
| ChatGPT | chatgpt | https://chat.openai.com | 🤖 |
| DeepSeek | deepseek | https://chat.deepseek.com | 🔍 |
| Claude | claude | https://claude.ai | 🧠 |
| 通义千问 | tongyi | https://tongyi.aliyun.com | ☁️ |

## Behavior

### WebView 生命周期

1. **创建**：首次切换到某模型时创建 WebView 实例
2. **显示**：调用 webview.show() 显示，setPosition/setSize 定位到容器
3. **隐藏**：调用 webview.hide() 隐藏，保留会话状态
4. **销毁**：组件卸载时调用 webview.close() 清理

### 定位机制

1. 获取容器 div 的 getBoundingClientRect()
2. 调用 webview.setPosition(new LogicalPosition(x, y))
3. 调用 webview.setSize(new LogicalSize(width, height))
4. 监听 window resize 和 ResizeObserver 自动重新定位

### 用户自定义模型

- 存储位置：localStorage (key: 'ai-hub-custom-models')
- 数据格式：AIModel[]
- 操作：addCustomModel, removeCustomModel, getAllModels

## Dependencies

- @tauri-apps/api/webview
- @tauri-apps/api/window
- @tauri-apps/api/dpi
- @tauri-apps/plugin-shell (可选，用于在浏览器中打开)

## Permissions

- core:webview:default
- core:webview:allow-create-webview
- core:webview:allow-webview-show
- core:webview:allow-webview-hide
- core:webview:allow-webview-close
- core:webview:allow-set-webview-size
- core:webview:allow-set-webview-position
- core:webview:allow-set-webview-focus
