# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toolkit is a cross-platform desktop utility app built with Tauri 2.0 (Rust backend + Vue 3 frontend). It provides developer/conversion tools in a Spotlight-like UI with fuzzy search, clipboard monitoring, and smart recommendations. UI language is Chinese (Simplified).

## Commands

```bash
npm install              # Install dependencies
npx tauri dev            # Start dev server (Vite + Tauri)
npx tauri build          # Production build
vue-tsc -b               # Type check only
npm run build            # Frontend build (vue-tsc + vite build)
```

Always run from the `toolkit/` root directory. The `npx tauri dev` command requires Rust toolchain (`source $HOME/.cargo/env`).

## Architecture

### Frontend (src/)

- **View routing** is a simple `currentView` ref in `App.vue` (no Vue Router). Views: `search`, `tool`, `document-converter`, `calculator`, `ai-hub`, `settings`, `history`.
- **Tool system** (`src/tools/`): Each tool is a module exporting a `Tool` object with `id`, `name`, `keywords`, `actions[]`, and optional `detect()` for clipboard scoring. Register new tools in `src/tools/index.ts`.
- **State**: Three Pinia stores using Composition API: `useAppStore` (theme, window), `useToolsStore` (registry, favorites, recent), `useHistoryStore` (execution history, 7-day auto-clean). All persist to localStorage with `toolkit-` prefix.
- **UI primitives** (`src/components/ui/`): shadcn-vue pattern using `cn()` (clsx + tailwind-merge) and class-variance-authority.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. CSS variables in `src/assets/main.css` (HSL values). Dark mode via `.dark` class on `<html>`.

### Backend (src-tauri/)

Rust backend is minimal. `lib.rs` handles: system tray, global shortcut (`Cmd+Shift+K`), and `copy_image_to_clipboard` IPC command. Plugins: `global-shortcut`, `clipboard-manager`, `dialog`, `fs`, `log`.

### Tauri Config

- Window: frameless (`decorations: false`), transparent, 680x480
- WebView API requires `unstable` feature flag in `Cargo.toml`
- Permissions declared in `src-tauri/capabilities/default.json`

## Adding a New Tool

1. Create `src/tools/<tool-name>/index.ts` exporting a `const xxxTool: Tool`
2. Import and add to the tools array in `src/tools/index.ts`
3. For custom UI (not just input/output textarea), create a dedicated view component and add routing in `App.vue`'s `handleSelectTool`

## Version Management

Version is defined in three files (must stay in sync):
- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `[package] version`

MSI builds require numeric-only versions (no `-alpha` suffixes).

## CI/CD

GitHub Actions (`.github/workflows/build.yml`) builds for linux-x86_64, windows-x86_64, macos-aarch64, macos-x86_64. Triggers on push to `main`, tags `v*`, and PRs to `main`. Uses `npm install` (not `npm ci`) to avoid cross-platform lock file issues.

## Key Conventions

- All Vue components use `<script setup lang="ts">` with Composition API
- localStorage keys are prefixed with `toolkit-`
- Fuse.js for fuzzy search throughout the app
- Emoji icons for tools (not icon components)
- Tools with complex UI get dedicated view components; simple tools use the generic `ToolView`
