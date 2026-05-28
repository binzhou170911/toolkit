# Toolkit 构建与运维文档

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [本地开发环境搭建](#本地开发环境搭建)
- [本地构建](#本地构建)
- [GitHub Actions 自动构建](#github-actions-自动构建)
- [版本发布流程](#版本发布流程)
- [问题记录与解决方案](#问题记录与解决方案)

---

## 项目概述

Toolkit 是一个基于 Tauri 2.0 的跨平台桌面工具集合应用，支持 Windows、macOS、Linux 三大平台。

**版本**: 1.0.0

**功能模块**:
- JSON 格式化/压缩/转YAML/转XML/提取Keys
- Base64 编解码（支持文本和图片）
- 二维码生成/解析
- Hash 计算（MD5/SHA-1/SHA-256/SHA-512）
- 文本编解码（URL/HTML/Hex/Unicode）
- 时间戳转换
- 文档格式转换（Word/PDF/Markdown）
- 计算器（基础/科学/程序员/单位/日期/金融）
- AI 助手（ChatGPT/DeepSeek/Claude/通义千问）

---

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

---

## 本地开发环境搭建

### 1. 安装 Node.js

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# 验证
node --version  # v22.x 或更高
npm --version   # 10.x 或更高
```

### 2. 安装 Rust

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 配置环境变量
source $HOME/.cargo/env

# 验证
rustc --version  # rustc 1.77.2 或更高
cargo --version
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

### 4. 克隆项目

```bash
git clone git@github.com:binzhou170911/toolkit.git
cd toolkit
```

### 5. 安装依赖

```bash
npm install
```

### 6. 启动开发服务器

```bash
# 需要在 toolkit 目录下执行
source $HOME/.cargo/env
npx tauri dev
```

---

## 本地构建

### macOS 构建

```bash
cd /Users/bin/zhoubin/workspace/Application/toolkit
source $HOME/.cargo/env
npx tauri build
```

**输出文件**:
```
src-tauri/target/release/bundle/
├── macos/
│   └── Toolkit.app          # 应用程序包
└── dmg/
    └── Toolkit_1.0.0_aarch64.dmg  # DMG 安装镜像
```

### Windows 构建

```powershell
cd toolkit
npx tauri build
```

**输出文件**:
```
src-tauri/target/release/bundle/
├── msi/
│   └── Toolkit_1.0.0_x64_en-US.msi    # MSI 安装包
└── nsis/
    └── Toolkit_1.0.0_x64-setup.exe     # EXE 安装程序
```

### Linux 构建

```bash
cd toolkit
npx tauri build
```

**输出文件**:
```
src-tauri/target/release/bundle/
├── deb/
│   └── toolkit_1.0.0_amd64.deb         # Debian 安装包
└── appimage/
    └── toolkit_1.0.0_amd64.AppImage    # AppImage
```

---

## GitHub Actions 自动构建

### 工作流配置

文件位置: `.github/workflows/build.yml`

```yaml
name: Build Toolkit

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            label: linux-x86_64
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            label: windows-x86_64
          - platform: macos-latest
            target: aarch64-apple-darwin
            label: macos-aarch64
          - platform: macos-latest
            target: x86_64-apple-darwin
            label: macos-x86_64

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'

      - name: Install dependencies
        run: npm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: 'Toolkit v__VERSION__'
          releaseBody: 'See the assets for download links.'
          releaseDraft: true
          prerelease: false
          args: --target ${{ matrix.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: toolkit-${{ matrix.label }}
          path: |
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.dmg
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.app
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.exe
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.msi
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.deb
            src-tauri/target/${{ matrix.target }}/release/bundle/**/*.AppImage
```

### 触发构建

构建在以下情况自动触发：
1. 推送代码到 `main` 分支
2. 推送带有 `v` 前缀的标签（如 `v1.0.0`）
3. 创建 Pull Request 到 `main` 分支

---

## 版本发布流程

### 1. 更新版本号

需要更新以下三个文件：

**package.json**:
```json
{
  "version": "1.0.0"
}
```

**src-tauri/tauri.conf.json**:
```json
{
  "version": "1.0.0"
}
```

**src-tauri/Cargo.toml**:
```toml
[package]
version = "1.0.0"
```

> **注意**: MSI 安装包要求版本号必须是数字格式（如 `1.0.0`），不支持带字母的预发布版本（如 `1.0.0-alpha.1`）。

### 2. 提交代码

```bash
git add -A
git commit -m "release: v1.0.0"
git push origin main
```

### 3. 创建版本标签

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 4. 等待构建完成

访问 https://github.com/binzhou170911/toolkit/actions 查看构建进度。

### 5. 查看发布

构建完成后，安装包会自动发布到 https://github.com/binzhou170911/toolkit/releases

---

## 问题记录与解决方案

### 问题 1: npm ci 失败 - package-lock.json 不同步

**错误信息**:
```
npm error `npm ci` can only install packages when your package.json and package-lock.json
or npm-shrinkwrap.json are in sync.
Missing: @tailwindcss/oxide-android-arm64@4.3.0 from lock file
Missing: @tauri-apps/cli-darwin-x64@2.11.1 from lock file
...
```

**原因**: `npm ci` 要求 `package-lock.json` 与 `package.json` 完全匹配，且包含所有平台的可选依赖。在 macOS 上生成的锁文件不包含 Windows/Linux 平台的依赖。

**解决方案**:
1. 修改 `.github/workflows/build.yml`，将 `npm ci` 改为 `npm install`
2. 或者删除锁文件重新生成：
   ```bash
   rm package-lock.json
   npm install
   git add package-lock.json
   git commit -m "fix: regenerate package-lock.json"
   git push
   ```

---

### 问题 2: MSI 版本号格式错误

**错误信息**:
```
failed to bundle project `optional pre-release identifier in app version must be
numeric-only and cannot be greater than 65535 for msi target`
```

**原因**: Windows MSI 安装包要求版本号必须是数字格式（`x.y.z` 或 `x.y.z.w`），不支持带字母的预发布版本（如 `1.0.0-alpha.1`）。

**解决方案**:
将版本号从 `1.0.0-alpha.1` 改为 `1.0.0`：
```bash
# 更新 package.json
sed -i 's/"version": "1.0.0-alpha.1"/"version": "1.0.0"/' package.json

# 更新 tauri.conf.json
sed -i 's/"version": "1.0.0-alpha.1"/"version": "1.0.0"/' src-tauri/tauri.conf.json

# 更新 Cargo.toml
sed -i 's/version = "1.0.0-alpha.1"/version = "1.0.0"/' src-tauri/Cargo.toml
```

---

### 问题 3: GitHub Release 创建失败

**错误信息**:
```
Error: Resource not accessible by integration -
https://docs.github.com/rest/releases/releases#create-a-release
```

**原因**: GitHub Actions 的 `GITHUB_TOKEN` 默认没有创建 Release 的权限。

**解决方案**:
在 `.github/workflows/build.yml` 中添加权限配置：
```yaml
permissions:
  contents: write
```

---

### 问题 4: Tauri WebView 创建失败

**错误信息**:
```
this feature requires the `unstable` flag on Cargo.toml
```

**原因**: Tauri 2.0 的 WebView API 是实验性功能，需要在 Cargo.toml 中启用 `unstable` 特性。

**解决方案**:
在 `src-tauri/Cargo.toml` 中添加 `unstable` 特性：
```toml
[dependencies]
tauri = { version = "2.11.1", features = ["macos-private-api", "tray-icon", "unstable"] }
```

---

### 问题 5: Tauri dev 命令找不到

**错误信息**:
```
npm error Missing script: "dev"
```

**原因**: 在错误的目录下执行命令，或者 `tauri.conf.json` 中的 `beforeDevCommand` 配置错误。

**解决方案**:
1. 确保在 `toolkit` 目录下执行命令
2. 检查 `src-tauri/tauri.conf.json` 中的配置：
   ```json
   {
     "build": {
       "beforeDevCommand": "npm run dev",
       "beforeBuildCommand": "npm run build"
     }
   }
   ```

---

### 问题 6: Bundle identifier 以 .app 结尾

**警告信息**:
```
The bundle identifier "com.toolkit.app" set in `"tauri.conf.json" identifier` ends
with `.app`. This is not recommended because it conflicts with the application bundle
extension on macOS.
```

**解决方案**:
修改 `src-tauri/tauri.conf.json` 中的 identifier：
```json
{
  "identifier": "com.toolkit.desktop"
}
```

---

### 问题 7: SSH 推送失败

**错误信息**:
```
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

**原因**: 未配置 SSH 密钥或密钥未添加到 GitHub。

**解决方案**:
1. 生成 SSH 密钥：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519 -N ""
   ```

2. 复制公钥：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. 添加到 GitHub：
   - 访问 https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥并保存

4. 测试连接：
   ```bash
   ssh -T git@github.com
   ```

---

## 常用命令速查

### 开发相关

```bash
# 启动开发服务器
npx tauri dev

# 类型检查
npx tsc --noEmit

# 本地构建
npx tauri build
```

### Git 相关

```bash
# 查看状态
git status

# 提交代码
git add -A
git commit -m "your commit message"
git push origin main

# 创建标签
git tag v1.0.0
git push origin v1.0.0

# 删除远程标签
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 重新触发构建
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

### 依赖相关

```bash
# 安装依赖
npm install

# 重新生成锁文件
rm package-lock.json
npm install

# 清理构建缓存
rm -rf src-tauri/target
rm -rf dist
rm -rf node_modules
npm install
```

---

## 文件结构

```
toolkit/
├── .github/
│   └── workflows/
│       └── build.yml           # GitHub Actions 配置
├── docs/
│   └── BUILD.md                # 本文档
├── openspec/                   # OpenSpec 文档
├── public/                     # 静态资源
│   └── ai-models/              # AI 模型图标
├── src/                        # Vue 前端源码
│   ├── components/             # Vue 组件
│   ├── hooks/                  # Vue Hooks
│   ├── store/                  # Pinia 状态
│   ├── tools/                  # 工具模块
│   ├── types/                  # TypeScript 类型
│   ├── App.vue                 # 根组件
│   └── main.ts                 # 入口文件
├── src-tauri/                  # Tauri 后端源码
│   ├── capabilities/           # 权限配置
│   ├── icons/                  # 应用图标
│   ├── src/                    # Rust 源码
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── index.html                  # HTML 入口
├── package.json                # Node.js 依赖配置
├── tsconfig.json               # TypeScript 配置
└── vite.config.ts              # Vite 配置
```

---

## 相关链接

- [Tauri 官方文档](https://tauri.app/v2/)
- [Vue 3 文档](https://vuejs.org/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [项目仓库](https://github.com/binzhou170911/toolkit)
- [构建状态](https://github.com/binzhou170911/toolkit/actions)
- [版本发布](https://github.com/binzhou170911/toolkit/releases)
