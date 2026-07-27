# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Tauri 2 desktop utility app with a Vue 3 frontend and Rust backend. Work from the `toolkit/` directory. Frontend source lives in `src/`: `components/` for Vue views and UI primitives, `hooks/` for composables, `store/` for Pinia stores, `tools/` for individual utility modules, and `types/` for shared TypeScript types. Tauri backend code and permissions live in `src-tauri/`, with Rust commands in `src-tauri/src/` and app configuration in `src-tauri/tauri.conf.json`. Static assets belong in `public/`; build and operations notes are in `docs/`; OpenSpec change proposals are under `openspec/`.

## Build, Test, and Development Commands

Run commands from `toolkit/`.

```bash
npm install        # Install frontend and Tauri JS dependencies
npm run dev        # Start the Vite frontend only
npx tauri dev      # Run the full desktop app locally
npm run build      # Type-check with vue-tsc, then build frontend assets
npx tauri build    # Build production desktop bundles
npm run preview    # Preview the built frontend
```

Tauri commands require Rust 1.77.2+ and platform-specific system dependencies. On macOS, run `source $HOME/.cargo/env` if Cargo is not already on `PATH`.

## Coding Style & Naming Conventions

Use TypeScript, Vue `<script setup lang="ts">`, and the Composition API. Keep indentation at two spaces, matching existing Vue and Rust files. Name Vue components in PascalCase, composables as `useXxx`, stores as `useXxxStore`, and tool folders in kebab-case such as `json-formatter`. New tools should export a `Tool` object from `src/tools/<tool-name>/index.ts` and be registered in `src/tools/index.ts`. UI text is Simplified Chinese unless there is a product reason to do otherwise.

## Testing Guidelines

No first-party test runner is currently configured. Before opening a PR, run `npm run build`; for backend or desktop changes, also run `npx tauri build` when practical. If adding tests, colocate focused TypeScript tests near the feature or under a future `src/**/__tests__/` folder, and use names like `<feature>.test.ts`.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style prefixes: `feat:`, `fix:`, and `docs:`. Keep commits small and imperative, for example `fix: handle empty clipboard input`. Pull requests should include a short summary, verification steps, linked issues or OpenSpec change IDs when relevant, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips

Keep Tauri permissions scoped in `src-tauri/capabilities/default.json`. Do not commit local secrets, generated bundles, or machine-specific paths. Version releases must keep `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` in sync.
