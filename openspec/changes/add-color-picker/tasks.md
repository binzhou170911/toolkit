## 1. 技术验证

- [x] 1.1 验证 EyeDropper API 在 Tauri macOS WKWebView 中是否可用
- [x] 1.2 如不可用，实现 Rust 原生截图 fallback 方案

## 2. 核心取色功能

- [x] 2.1 创建 `src/tools/color-picker/index.ts` 工具定义
- [x] 2.2 实现 `hexToRgb(hex)` 颜色转换函数
- [x] 2.3 实现 `rgbToHsl(r, g, b)` 颜色转换函数
- [x] 2.4 实现 `pickColor()` 取色主函数（调用 EyeDropper API）
- [x] 2.5 实现取色前窗口最小化、取色后窗口恢复

## 3. 取色器界面

- [x] 3.1 创建 `src/components/ColorPickerView.vue` 自定义视图
- [x] 3.2 实现颜色预览色块（大色块展示当前颜色）
- [x] 3.3 实现 HEX/RGB/HSL 三格式同时显示
- [x] 3.4 实现"取色"按钮（激活吸管）
- [x] 3.5 实现点击颜色值复制到剪贴板
- [x] 3.6 实现复制成功 Toast 提示

## 4. 集成

- [x] 4.1 注册 color-picker 工具到 `src/tools/index.ts`
- [x] 4.2 在 `App.vue` 添加 color-picker 视图路由
- [x] 4.3 更新工具 keywords 支持搜索（颜色、取色、color、picker、吸管）
