## Context

Toolkit 需要新增一个屏幕取色器工具。用户点击取色后，通过系统级吸管从屏幕任意位置获取颜色值，显示为 HEX/RGB/HSL 格式并支持一键复制。

## Goals / Non-Goals

**Goals:**
- 一键激活系统吸管，点击屏幕取色
- 颜色预览色块直观展示
- 同时显示 HEX、RGB、HSL 三种格式
- 一键复制颜色值（点击即复制）
- 取色时工具窗口自动最小化，不影响取色

**Non-Goals:**
- 不支持颜色历史记录（单次使用）
- 不支持调色板/颜色混合
- 不支持屏幕放大镜预览（EyeDropper API 由系统提供）
- 不支持取色时实时预览（点击才取色）

## Decisions

### 1. 取色技术方案

**首选：EyeDropper API**

```typescript
const dropper = new EyeDropper()
const result = await dropper.open()
// result.sRGBHex → "#ff0000"
```

理由：
- W3C 标准，浏览器原生 API
- 零依赖，不需要 Rust crate
- 系统级吸管光标，体验原生
- 代码量极小（~10 行）

浏览器支持：
- Chromium 95+（Tauri Windows/Linux WebView2）
- Safari 16.4+（Tauri macOS WKWebView）— 需要验证

**备选：Rust 原生截图 + 像素读取**

如果 EyeDropper API 在 macOS WKWebView 中不可用：

```
Cargo.toml 添加 screenshots 或 scap crate
→ Rust 命令截取全屏
→ 返回图像数据到前端
→ 前端 Canvas 读取像素颜色
```

理由：跨平台截图库成熟，但复杂度高、依赖多。

**验证策略**：先实现 EyeDropper 方案，如果 `new EyeDropper()` 抛出异常则 fallback 到 Rust 方案。

### 2. 颜色格式转换

纯前端实现，无外部依赖：

| 格式 | 转换逻辑 |
|------|---------|
| HEX → RGB | `parseInt(hex.slice(1,3), 16)` 等 |
| RGB → HSL | 标准公式（亮度、饱和度、色相） |
| RGB → HEX | `rgb.toString(16).padStart(2, '0')` |

EyeDropper 返回的 `sRGBHex` 已经是 HEX 格式，只需转换为 RGB 和 HSL。

### 3. 工具窗口最小化

使用已有的 Tauri 窗口 API：

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window'

// 取色前最小化
await getCurrentWindow().minimize()

// 取色后恢复
await getCurrentWindow().unminimize()
await getCurrentWindow().setFocus()
```

理由：复用现有 API，无额外依赖。

### 4. 工具类型选择

**选择：自定义视图组件（类似 calculator）**

理由：
- 需要颜色预览色块（非纯文本输出）
- 需要多格式同时显示
- 需要取色按钮交互
- 不适合通用 ToolView 的 textarea 输入/输出模式

## Risks / Trade-offs

1. **EyeDropper API 兼容性**
   - 风险：macOS WKWebView 可能不支持
   - 缓解：运行时检测 `typeof EyeDropper`，不可用时 fallback 到 Rust 方案
   - 验证：任务 1.1 专门验证

2. **窗口最小化/恢复时机**
   - 风险：`EyeDropper.open()` 是异步的，恢复窗口可能需要等待
   - 缓解：在 `.open()` 的 `.then()` 或 `await` 后立即恢复

3. **用户取消取色**
   - 风险：用户按 Esc 取消，`open()` 会 reject
   - 缓解：catch 异常，恢复窗口，不显示错误

## Open Questions

1. macOS WKWebView 是否支持 EyeDropper API？（任务 1.1 验证）
2. 是否需要在颜色值旁显示"已复制"的 Toast 提示？
