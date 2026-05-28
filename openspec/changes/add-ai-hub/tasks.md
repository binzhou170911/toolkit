## 1. 项目设置

- [x] 1.1 创建 ai-hub 工具目录结构
- [x] 1.2 添加 Tauri webview 权限到 capabilities/default.json
- [x] 1.3 注册 ai-hub 工具到工具列表

## 2. 模型配置

- [x] 2.1 定义 AIModel 接口
- [x] 2.2 实现内置模型配置（ChatGPT、DeepSeek、Claude、通义千问）
- [x] 2.3 实现 localStorage 读写用户自定义模型
- [x] 2.4 实现 getAllModels、addCustomModel、removeCustomModel 函数

## 3. AI Hub 主界面

- [x] 3.1 实现公共布局（Header + 返回按钮 + 标题）
- [x] 3.2 实现模型标签栏（显示模型图标和名称）
- [x] 3.3 实现 WebView 容器区域

## 4. WebView 管理

- [x] 4.1 实现创建 WebView 实例
- [x] 4.2 实现 show/hide 切换（保留登录状态）
- [x] 4.3 实现 setPosition/setSize 定位到容器区域
- [x] 4.4 实现窗口 resize 时自动跟随
- [x] 4.5 实现 ResizeObserver 监听容器大小变化
- [x] 4.6 实现组件卸载时清理所有 WebView

## 5. 用户自定义模型

- [x] 5.1 实现添加模型对话框（名称、地址、图标）
- [x] 5.2 实现删除自定义模型（hover 显示删除按钮）
- [x] 5.3 实现输入验证和错误提示

## 6. 搜索集成

- [x] 6.1 AI Hub 工具 keywords 包含所有模型名称
- [x] 6.2 首页搜索模型名可找到 AI Hub 工具

## 7. 辅助功能

- [x] 7.1 实现刷新当前 WebView
- [x] 7.2 实现在浏览器中打开当前模型

## 8. 集成测试

- [ ] 8.1 测试 WebView 加载和显示
- [ ] 8.2 测试标签切换和状态保留
- [ ] 8.3 测试窗口大小变化跟随
- [ ] 8.4 测试用户自定义模型增删
- [ ] 8.5 测试搜索集成
