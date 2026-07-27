// 声明 pdfjs-dist 的 legacy worker 构建文件（.mjs，无官方类型）。
// 该文件仅作为主线程 fake worker 在 #initialize 时由 pdfjs 内部使用，
// 运行时由 Vite 正确解析，这里只需告诉 TS 它存在、类型为 any，避免
// `npm run build`（vue-tsc）阶段报 TS7016 中断 CI。
declare module 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
