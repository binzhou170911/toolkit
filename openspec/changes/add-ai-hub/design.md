## Context

Toolkit 是一个基于 Tauri 2.0 + Vue 3 的桌面工具应用，目前已实现 JSON、Base64、二维码、Hash、文本编解码、文档格式转换、计算器等工具。现在需要添加 AI Hub 功能，让用户可以快速访问各大 AI 模型的网页版。

## Goals / Non-Goals

**Goals:**
- 支持 ChatGPT、DeepSeek、Claude、通义千问四个内置模型
- 每个模型使用独立 WebView，保留登录状态
- 支持用户自定义添加其他 AI 模型
- 配置持久化到 localStorage
- 集成到搜索系统，支持关键词搜索
- 复用项目公共布局样式

**Non-Goals:**
- 不支持 API 调用（仅嵌入网页版）
- 不支持对话历史记录
- 不支持多模型同时显示
- 不支持模型间消息同步

## Decisions

### 1. WebView 实现方案

**选择：Tauri 原生 WebView（@tauri-apps/api/webview）**

理由：
- iframe 被大多数 AI 网站禁止（X-Frame-Options: DENY）
- Tauri WebView 是原生 OS 级渲染，不受同源策略限制
- 支持 show/hide 保留会话状态
- 支持 setPosition/setSize 动态定位

替代方案：
- iframe：被网站禁止，不可行
- WebviewWindow（新窗口）：不符合嵌入式布局需求
- 系统浏览器跳转：不符合"快捷访问"需求

### 2. WebView 定位策略

**选择：基于容器 div 的 getBoundingClientRect + setPosition/setSize**

理由：
- Tauri WebView 是原生覆盖层，不是 DOM 元素
- 需要通过 JS 计算位置覆盖到 Vue 容器区域
- 监听窗口 resize 和 ResizeObserver 自动调整

替代方案：
- setAutoResize：只能跟随窗口大小，不能精确跟随容器
- 固定位置：不响应窗口大小变化

### 3. 模型配置持久化

**选择：localStorage 存储用户自定义模型**

理由：
- 简单直接，无需额外依赖
- Tauri 应用中 localStorage 持久化到本地文件
- 读写性能好

替代方案：
- Tauri Store 插件：需要额外依赖
- Rust 后端存储：过于复杂
- JSON 文件：需要文件读写权限

### 4. 搜索集成方案

**选择：AI Hub 工具 keywords 包含所有模型名称**

理由：
- 复用现有 Fuse.js 搜索机制
- 无需修改 SearchView 组件
- 用户搜索模型名即可找到 AI Hub

替代方案：
- 每个模型注册为独立工具：污染工具列表
- 修改 SearchView 支持子项搜索：改动过大

## Risks / Trade-offs

1. **WebView 定位精度**
   - 风险：窗口快速调整大小时 WebView 可能短暂错位
   - 缓解：使用 ResizeObserver + 防抖处理，100ms 延迟

2. **内存占用**
   - 风险：多个 WebView 实例同时存在占用较多内存
   - 缓解：show/hide 机制，未激活的 WebView 不消耗 GPU 资源

3. **登录状态丢失**
   - 风险：某些网站可能因 session 过期需要重新登录
   - 缓解：WebView 保留 cookie，正常使用不会丢失

4. **网站兼容性**
   - 风险：某些 AI 网站可能检测到非浏览器环境并拒绝服务
   - 缓解：可设置 userAgent 模拟浏览器

## Open Questions

1. 是否需要支持自定义 userAgent？
2. 是否需要支持模型分组（国内/国外）？
3. 是否需要支持快捷键切换模型？
