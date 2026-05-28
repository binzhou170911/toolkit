# Toolkit

跨平台桌面工具集合应用，基于 Tauri 2.0 构建，支持 Windows、macOS、Linux。

## 功能模块

- JSON 格式化/压缩/转YAML/转XML/提取Keys
- Base64 编解码（支持文本和图片）
- 二维码生成/解析
- Hash 计算（MD5/SHA-1/SHA-256/SHA-512）
- 文本编解码（URL/HTML/Hex/Unicode）
- 时间戳转换
- 文档格式转换（Word/PDF/Markdown）
- 计算器（基础/科学/程序员/单位/日期/金融）
- AI 助手（ChatGPT/DeepSeek/Claude/通义千问）

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 | 3.5.34 |
| 类型系统 | TypeScript | 6.0.2 |
| 构建工具 | Vite | 8.0.12 |
| 桌面框架 | Tauri | 2.11.1 |
| 后端语言 | Rust | 1.77.2+ |
| UI 工具 | TailwindCSS | 4.3.0 |
| 状态管理 | Pinia | 3.0.4 |

## 本地开发环境搭建

### 1. 安装 Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts
node --version  # v22.x 或更高
```

### 2. 安装 Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # rustc 1.77.2 或更高
```

### 3. 安装系统依赖

**macOS**:
```bash
xcode-select --install
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows**:
- 安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 4. 克隆与运行

```bash
git clone git@github.com:binzhou170911/toolkit.git
cd toolkit
npm install
npx tauri dev
```

## 本地构建

```bash
cd toolkit
source $HOME/.cargo/env
npx tauri build
```

**输出文件**:

| 平台 | 格式 | 路径 |
|------|------|------|
| macOS | DMG | `src-tauri/target/release/bundle/dmg/` |
| macOS | APP | `src-tauri/target/release/bundle/macos/` |
| Windows | MSI | `src-tauri/target/release/bundle/msi/` |
| Windows | EXE | `src-tauri/target/release/bundle/nsis/` |
| Linux | DEB | `src-tauri/target/release/bundle/deb/` |
| Linux | AppImage | `src-tauri/target/release/bundle/appimage/` |

## GitHub Actions 自动构建

构建在以下情况自动触发：
1. 推送代码到 `main` 分支
2. 推送带有 `v` 前缀的标签（如 `v1.0.0`）
3. 创建 Pull Request 到 `main` 分支

构建完成后，安装包自动发布到 [GitHub Releases](https://github.com/binzhou170911/toolkit/releases)。

## 版本发布流程

### 1. 更新版本号（三个文件）

- `package.json` → `"version": "1.0.0"`
- `src-tauri/tauri.conf.json` → `"version": "1.0.0"`
- `src-tauri/Cargo.toml` → `version = "1.0.0"`

> MSI 安装包要求版本号必须是数字格式（如 `1.0.0`），不支持带字母的预发布版本。

### 2. 提交并打标签

```bash
git add -A
git commit -m "release: v1.0.0"
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

### 3. 等待构建完成

访问 https://github.com/binzhou170911/toolkit/actions 查看构建进度。

## 常用命令速查

```bash
npx tauri dev          # 启动开发服务器
npx tauri build        # 本地构建
vue-tsc -b             # 类型检查
npm install            # 安装依赖
```

## 文件结构

```
toolkit/
├── .github/workflows/build.yml   # GitHub Actions 配置
├── docs/BUILD.md                  # 构建与运维文档
├── public/                        # 静态资源
├── src/                           # Vue 前端源码
│   ├── components/                # Vue 组件
│   ├── hooks/                     # Composables
│   ├── store/                     # Pinia 状态管理
│   ├── tools/                     # 工具模块
│   └── types/                     # TypeScript 类型
├── src-tauri/                     # Tauri 后端源码
│   ├── capabilities/              # 权限配置
│   ├── src/                       # Rust 源码
│   ├── Cargo.toml                 # Rust 依赖
│   └── tauri.conf.json            # Tauri 配置
├── package.json
└── vite.config.ts
```

## 相关链接

- [Tauri 官方文档](https://tauri.app/v2/)
- [Vue 3 文档](https://vuejs.org/)
- [项目仓库](https://github.com/binzhou170911/toolkit)
- [构建状态](https://github.com/binzhou170911/toolkit/actions)
- [版本发布](https://github.com/binzhou170911/toolkit/releases)
