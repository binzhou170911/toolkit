use tauri::{
  image::Image,
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_clipboard_manager::ClipboardExt;
use base64::Engine;

mod magnifier;

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
struct EngineImage {
  name: String,
  data: String,
  mime: String,
}

#[derive(Serialize)]
struct EngineConvertResult {
  markdown: String,
  images: Vec<EngineImage>,
  engine: String,
}

fn toolkit_tmp_id() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_nanos())
    .unwrap_or(0);
  format!("{:x}", nanos)
}

fn cmd_available(cmd: &str, arg: &str) -> bool {
  Command::new(cmd)
    .arg(arg)
    .output()
    .map(|o| o.status.success())
    .unwrap_or(false)
}

/// 探测可 import fitz（PyMuPDF）的 Python 解释器。
/// 依次尝试系统 python3/python 与本沙箱隔离 venv，返回第一个可用解释器路径。
fn find_fitz_python() -> Option<String> {
  let candidates = [
    "python3",
    "python",
    "/Users/bin/.workbuddy/binaries/python/envs/mineru/bin/python",
  ];
  for c in candidates {
    let out = Command::new(c)
      .arg("-c")
      .arg("import fitz; import sys; print(sys.executable)")
      .output();
    if let Ok(o) = out {
      if o.status.success() {
        let path = String::from_utf8_lossy(&o.stdout).trim().to_string();
        if !path.is_empty() {
          return Some(path);
        }
      }
    }
  }
  None
}

fn read_image_base64(path: &Path) -> Option<EngineImage> {
  let data = fs::read(path).ok()?;
  let name = path.file_name()?.to_string_lossy().to_string();
  let ext = path
    .extension()
    .map(|e| e.to_string_lossy().to_lowercase())
    .unwrap_or_default();
  let mime = match ext.as_str() {
    "png" => "image/png",
    "jpg" | "jpeg" => "image/jpeg",
    "gif" => "image/gif",
    "webp" => "image/webp",
    "bmp" => "image/bmp",
    "svg" => "image/svg+xml",
    _ => "application/octet-stream",
  };
  let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
  Some(EngineImage {
    name,
    data: b64,
    mime: mime.to_string(),
  })
}

fn collect_images_recursive(dir: &Path) -> Vec<EngineImage> {
  let mut images = Vec::new();
  if let Ok(entries) = fs::read_dir(dir) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_dir() {
        images.extend(collect_images_recursive(&path));
      } else if let Some(img) = read_image_base64(&path) {
        images.push(img);
      }
    }
  }
  images
}

fn find_largest_md(dir: &Path) -> Option<PathBuf> {
  let mut best: Option<(PathBuf, u64)> = None;
  fn walk(dir: &Path, best: &mut Option<(PathBuf, u64)>) {
    if let Ok(entries) = fs::read_dir(dir) {
      for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
          walk(&path, best);
        } else if path.extension().map(|e| e == "md").unwrap_or(false) {
          if let Ok(meta) = fs::metadata(&path) {
            let sz = meta.len();
            if best.as_ref().map(|(_, s)| sz > *s).unwrap_or(true) {
              *best = Some((path.clone(), sz));
            }
          }
        }
      }
    }
  }
  walk(dir, &mut best);
  best.map(|(p, _)| p)
}

/// 检测本机是否安装 pandoc / mineru
#[tauri::command]
async fn detect_engines() -> Result<serde_json::Value, String> {
  let pandoc = cmd_available("pandoc", "--version");
  let mineru = cmd_available("mineru", "--version") || cmd_available("magic-pdf", "--version");
  let pymupdf = find_fitz_python().is_some();
  Ok(serde_json::json!({ "pandoc": pandoc, "mineru": mineru, "pymupdf": pymupdf }))
}

/// Word → Markdown（Pandoc 引擎）
#[tauri::command]
async fn pandoc_to_markdown(file_name: String, file_data: String) -> Result<EngineConvertResult, String> {
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(&file_data)
    .map_err(|e| format!("文件解码失败：{}", e))?;
  let suffix = Path::new(&file_name)
    .extension()
    .map(|e| format!(".{}", e.to_string_lossy()))
    .unwrap_or_default();
  let in_file = std::env::temp_dir().join(format!("toolkit-in-{}{}", toolkit_tmp_id(), suffix));
  fs::write(&in_file, &bytes).map_err(|e| format!("写临时文件失败：{}", e))?;

  let out_dir = std::env::temp_dir().join(format!("toolkit-pandoc-{}", toolkit_tmp_id()));
  fs::create_dir_all(&out_dir).map_err(|e| format!("创建输出目录失败：{}", e))?;
  let media_dir = out_dir.join("media");
  let md_path = out_dir.join("output.md");

  let output = Command::new("pandoc")
    .arg(&in_file)
    .arg("-t")
    .arg("gfm")
    .arg("-o")
    .arg(&md_path)
    .arg("--extract-media")
    .arg(&media_dir)
    .output()
    .map_err(|e| format!("启动 pandoc 失败：{}（请确认已安装 pandoc）", e))?;

  let _ = fs::remove_file(&in_file);

  if !output.status.success() {
    let err = String::from_utf8_lossy(&output.stderr);
    return Err(format!("pandoc 转换失败：{}", err));
  }

  let markdown = fs::read_to_string(&md_path).map_err(|e| format!("读取结果失败：{}", e))?;
  let images = collect_images_recursive(&media_dir);
  Ok(EngineConvertResult {
    markdown,
    images,
    engine: "pandoc".into(),
  })
}

/// PDF → Markdown（MinerU 引擎，兼容旧版 magic-pdf）
#[tauri::command]
async fn mineru_to_markdown(file_name: String, file_data: String) -> Result<EngineConvertResult, String> {
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(&file_data)
    .map_err(|e| format!("文件解码失败：{}", e))?;
  let suffix = Path::new(&file_name)
    .extension()
    .map(|e| format!(".{}", e.to_string_lossy()))
    .unwrap_or_default();
  let in_file = std::env::temp_dir().join(format!("toolkit-in-{}{}", toolkit_tmp_id(), suffix));
  fs::write(&in_file, &bytes).map_err(|e| format!("写临时文件失败：{}", e))?;

  let out_dir = std::env::temp_dir().join(format!("toolkit-mineru-{}", toolkit_tmp_id()));
  fs::create_dir_all(&out_dir).map_err(|e| format!("创建输出目录失败：{}", e))?;

  let cmd = if cmd_available("mineru", "--version") {
    "mineru"
  } else {
    "magic-pdf"
  };
  let output = Command::new(cmd)
    .arg("-p")
    .arg(&in_file)
    .arg("-o")
    .arg(&out_dir)
    .output()
    .map_err(|e| format!("启动 {} 失败：{}", cmd, e))?;

  let _ = fs::remove_file(&in_file);

  if !output.status.success() {
    let err = String::from_utf8_lossy(&output.stderr);
    return Err(format!("{} 转换失败：{}", cmd, err));
  }

  let md_path = find_largest_md(&out_dir).ok_or("未找到输出的 Markdown 文件")?;
  let markdown = fs::read_to_string(&md_path).map_err(|e| format!("读取结果失败：{}", e))?;
  let images = collect_images_recursive(&out_dir);
  Ok(EngineConvertResult {
    markdown,
    images,
    engine: cmd.into(),
  })
}

/// PDF → Markdown（PyMuPDF 引擎，利用页面真实矢量线段 find_tables 还原表格）
#[tauri::command]
async fn pymupdf_to_markdown(file_name: String, file_data: String) -> Result<EngineConvertResult, String> {
  let python = find_fitz_python().ok_or("未检测到 PyMuPDF（请 pip install pymupdf 后重启应用）")?;
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(&file_data)
    .map_err(|e| format!("文件解码失败：{}", e))?;
  let suffix = Path::new(&file_name)
    .extension()
    .map(|e| format!(".{}", e.to_string_lossy()))
    .unwrap_or_default();
  let in_file = std::env::temp_dir().join(format!("toolkit-in-{}{}", toolkit_tmp_id(), suffix));
  fs::write(&in_file, &bytes).map_err(|e| format!("写临时文件失败：{}", e))?;

  let out_dir = std::env::temp_dir().join(format!("toolkit-pymupdf-{}", toolkit_tmp_id()));
  fs::create_dir_all(&out_dir).map_err(|e| format!("创建输出目录失败：{}", e))?;

  // 内嵌的 Python 脚本在编译期固化（include_str），运行时需落盘才能被 python 执行
  let script_src = include_str!("../scripts/pymupdf_to_md.py");
  let script_path = std::env::temp_dir().join(format!("toolkit-pymupdf-{}.py", toolkit_tmp_id()));
  fs::write(&script_path, script_src).map_err(|e| format!("写脚本失败：{}", e))?;

  let output = Command::new(&python)
    .arg(&script_path)
    .arg(&in_file)
    .arg(&out_dir)
    .output()
    .map_err(|e| format!("启动 python 失败：{}", e))?;

  let _ = fs::remove_file(&in_file);
  let _ = fs::remove_file(&script_path);

  if !output.status.success() {
    let err = String::from_utf8_lossy(&output.stderr);
    return Err(format!("PyMuPDF 转换失败：{}", err));
  }

  let md_path = out_dir.join("output.md");
  let markdown = fs::read_to_string(&md_path).map_err(|e| format!("读取结果失败：{}", e))?;
  let images = collect_images_recursive(&out_dir);
  Ok(EngineConvertResult {
    markdown,
    images,
    engine: "pymupdf".into(),
  })
}

#[tauri::command]
async fn copy_image_to_clipboard(
  app: tauri::AppHandle,
  data_url: String,
) -> Result<(), String> {
  // Extract base64 data from data URL
  let base64_data = if data_url.starts_with("data:image/") {
    data_url.split(',').nth(1).ok_or("Invalid data URL format")?
  } else {
    return Err("Invalid data URL format".to_string());
  };

  // Decode base64 to bytes
  let image_bytes = base64::engine::general_purpose::STANDARD
    .decode(base64_data)
    .map_err(|e| format!("Base64 decode error: {}", e))?;

  // Load image from bytes using the image crate
  let img = image::load_from_memory(&image_bytes)
    .map_err(|e| format!("Image load error: {}", e))?;

  // Convert to RGBA
  let rgba = img.to_rgba8();
  let (width, height) = rgba.dimensions();

  // Create Tauri Image from RGBA pixel data
  let image = Image::new_owned(rgba.into_raw(), width, height);

  // Use clipboard plugin to write image
  app.clipboard()
    .write_image(&image)
    .map_err(|e| format!("Clipboard error: {}", e))?;

  Ok(())
}

#[tauri::command]
async fn capture_screen() -> Result<String, String> {
  let screens = screenshots::Screen::all()
    .map_err(|e| format!("Failed to get screens: {}", e))?;

  let screen = screens.first()
    .ok_or("No screens found")?;

  let image = screen.capture()
    .map_err(|e| format!("Failed to capture screen: {}", e))?;

  let width = image.width() as u32;
  let height = image.height() as u32;

  // Convert RGBA to PNG bytes
  let img = image::RgbaImage::from_raw(width, height, image.to_vec())
    .ok_or("Failed to create image from buffer")?;

  let mut png_bytes: Vec<u8> = Vec::new();
  img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
    .map_err(|e| format!("Failed to encode PNG: {}", e))?;

  let base64_data = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
  Ok(format!("data:image/png;base64,{}", base64_data))
}

#[tauri::command]
async fn get_pixel_color(x: i32, y: i32) -> Result<String, String> {
  let screen = screenshots::Screen::from_point(x, y)
    .map_err(|e| format!("Failed to get screen for point: {}", e))?;

  let image = screen.capture_area(x, y, 1, 1)
    .map_err(|e| format!("Failed to capture pixel: {}", e))?;

  let buffer = image.to_vec();
  if buffer.len() >= 3 {
    let r = buffer[0];
    let g = buffer[1];
    let b = buffer[2];
    Ok(format!("#{:02x}{:02x}{:02x}", r, g, b))
  } else {
    Err("Failed to read pixel color".to_string())
  }
}

#[tauri::command]
async fn get_color_at_mouse() -> Result<String, String> {
  let (x, y) = get_mouse_position()?;
  log::info!("Mouse position: ({}, {})", x, y);

  // Debug: capture full screen and save to file
  #[cfg(target_os = "macos")]
  {
    use core_graphics::display::{CGDisplay, kCGWindowListOptionOnScreenOnly, kCGNullWindowID};
    use core_graphics::geometry::{CGPoint, CGRect, CGSize};

    let display = CGDisplay::main();
    let bounds = display.bounds();
    let full_rect = CGRect::new(&CGPoint::new(0.0, 0.0), &CGSize::new(bounds.size.width, bounds.size.height));

    if let Some(full_image) = CGDisplay::screenshot(full_rect, kCGWindowListOptionOnScreenOnly, kCGNullWindowID, 0) {
      let img_width = full_image.width() as u32;
      let img_height = full_image.height() as u32;
      let data = full_image.data();
      let bytes_per_row = full_image.bytes_per_row() as usize;
      let bits_per_pixel = full_image.bits_per_pixel() as usize;

      log::info!("Full screen capture: {}x{}, bpp={}, bpr={}", img_width, img_height, bits_per_pixel, bytes_per_row);

      // Convert BGRA to RGBA and save as PNG
      let buffer = data.bytes();
      let mut rgba_buffer = Vec::with_capacity((img_width * img_height * 4) as usize);
      for y in 0..img_height {
        for x in 0..img_width {
          let offset = (y as usize * bytes_per_row) + (x as usize * (bits_per_pixel / 8));
          if offset + 2 < buffer.len() {
            // BGRA to RGBA
            rgba_buffer.push(buffer[offset + 2]); // R
            rgba_buffer.push(buffer[offset + 1]); // G
            rgba_buffer.push(buffer[offset]);     // B
            rgba_buffer.push(255);                 // A
          }
        }
      }

      if let Some(img) = image::RgbaImage::from_raw(img_width, img_height, rgba_buffer) {
        let png_path = "/tmp/screen_capture.png";
        let _ = img.save(png_path);
        log::info!("Saved screen capture to {}", png_path);
      }
    }
  }

  let color = get_pixel_color_sync(x, y)?;
  log::info!("Color at mouse: {}", color);
  Ok(color)
}

/// 在系统文件管理器中定位并选中指定文件/目录。
/// macOS 用 `open -R`（在 Finder 中显示并选中文件）；
/// Windows 用 `explorer /select,"path"`；Linux 用 `xdg-open` 打开父目录。
/// 仅依赖标准库 std::process::Command，无需额外 Tauri 插件权限。
#[tauri::command]
async fn reveal_in_file_manager(path: String) -> Result<(), String> {
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg("-R")
      .arg(&path)
      .spawn()
      .map_err(|e| format!("无法打开文件管理器：{}", e))?;
  }
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("explorer")
      .arg(format!("/select,\"{}\"", path))
      .spawn()
      .map_err(|e| format!("无法打开文件管理器：{}", e))?;
  }
  #[cfg(target_os = "linux")]
  {
    let dir = std::path::Path::new(&path)
      .parent()
      .map(|p| p.to_string_lossy().to_string())
      .unwrap_or_else(|| ".".to_string());
    std::process::Command::new("xdg-open")
      .arg(&dir)
      .spawn()
      .map_err(|e| format!("无法打开文件管理器：{}", e))?;
  }
  Ok(())
}

#[tauri::command]
async fn register_color_pick_shortcut(app: tauri::AppHandle) -> Result<(), String> {
  let handle = app.clone();
  app.global_shortcut().on_shortcut(
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyC),
    move |_app, _shortcut, event| {
      if event.state == ShortcutState::Pressed {
        // Get current mouse position
        let mouse_pos = get_mouse_position().unwrap_or((0, 0));
        let x = mouse_pos.0;
        let y = mouse_pos.1;

        // Get the color at the mouse position
        if let Ok(color) = get_pixel_color_sync(x, y) {
          // Emit the color to the main window
          if let Some(main_window) = handle.get_webview_window("main") {
            let _ = main_window.emit("color-picked", color);
            let _ = main_window.show();
            let _ = main_window.set_focus();
          }
        }
      }
    },
  ).map_err(|e| format!("Failed to register shortcut: {}", e))?;

  Ok(())
}

fn get_mouse_position() -> Result<(i32, i32), String> {
  #[cfg(target_os = "macos")]
  {
    use core_graphics::event::CGEvent;
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let event_source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
      .map_err(|e| format!("Failed to create event source: {:?}", e))?;
    let event = CGEvent::new(event_source)
      .map_err(|e| format!("Failed to create event: {:?}", e))?;
    let point = event.location();
    Ok((point.x as i32, point.y as i32))
  }

  #[cfg(not(target_os = "macos"))]
  {
    Ok((0, 0))
  }
}

fn get_pixel_color_sync(x: i32, y: i32) -> Result<String, String> {
  #[cfg(target_os = "macos")]
  {
    use core_graphics::display::{CGDisplay, kCGWindowListOptionOnScreenOnly, kCGNullWindowID};
    use core_graphics::geometry::{CGPoint, CGRect, CGSize};

    let display = CGDisplay::main();
    let bounds = display.bounds();
    log::info!("Display bounds: origin=({}, {}), size=({}, {})", bounds.origin.x, bounds.origin.y, bounds.size.width, bounds.size.height);

    // Capture a small area around the target pixel using CGWindowListCreateImage
    // This captures the composited screen output (all visible windows including browsers)
    let rect = CGRect::new(&CGPoint::new((x - 1) as f64, (y - 1) as f64), &CGSize::new(3.0, 3.0));
    log::info!("Capture rect: origin=({}, {}), size=({}, {})", rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);

    let image = CGDisplay::screenshot(rect, kCGWindowListOptionOnScreenOnly, kCGNullWindowID, 0)
      .ok_or("Failed to capture screen with Core Graphics screenshot")?;

    // Get the pixel data from the center of the captured area
    let img_width = image.width() as usize;
    let img_height = image.height() as usize;
    let data = image.data();
    let bytes_per_row = image.bytes_per_row() as usize;
    let bits_per_pixel = image.bits_per_pixel() as usize;

    log::info!("Captured image: {}x{}, bpp={}, bpr={}", img_width, img_height, bits_per_pixel, bytes_per_row);

    // On Retina displays, the image has 2x pixels, so center of 3x3 area is at (2, 2)
    let scale = img_width / 3; // Should be 1 on non-Retina, 2 on Retina
    let center_x = scale;
    let center_y = scale;
    let offset = center_y * bytes_per_row + center_x * (bits_per_pixel / 8);

    log::info!("Scale factor: {}, reading pixel at ({}, {}), offset={}", scale, center_x, center_y, offset);

    let buffer = data.bytes();
    if bits_per_pixel >= 24 && offset + 2 < buffer.len() {
      // Log raw bytes for debugging
      log::info!("Raw bytes at offset {}: [{}, {}, {}, {}]", offset, buffer[offset], buffer[offset+1], buffer[offset+2], buffer[offset+3]);

      // CGImage on macOS uses BGRA format (32 bits per pixel)
      let (r, g, b) = if bits_per_pixel == 32 {
        // BGRA format
        (buffer[offset + 2], buffer[offset + 1], buffer[offset])
      } else {
        // RGB format
        (buffer[offset], buffer[offset + 1], buffer[offset + 2])
      };
      log::info!("Pixel at ({}, {}): R={}, G={}, B={}, bpp={}", x, y, r, g, b, bits_per_pixel);
      Ok(format!("#{:02x}{:02x}{:02x}", r, g, b))
    } else {
      Err(format!("Failed to read pixel color: bpp={}, offset={}, len={}", bits_per_pixel, offset, buffer.len()))
    }
  }

  #[cfg(not(target_os = "macos"))]
  {
    let screen = screenshots::Screen::from_point(x, y)
      .map_err(|e| format!("Failed to get screen for point: {}", e))?;

    let image = screen.capture_area(x, y, 1, 1)
      .map_err(|e| format!("Failed to capture pixel: {}", e))?;

    let buffer = image.to_vec();
    if buffer.len() >= 3 {
      let r = buffer[0];
      let g = buffer[1];
      let b = buffer[2];
      Ok(format!("#{:02x}{:02x}{:02x}", r, g, b))
    } else {
      Err("Failed to read pixel color".to_string())
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Create system tray menu
      let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
      let hide = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

      let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

      // Create system tray
      let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Toolkit")
        .on_menu_event(move |app, event| {
          match event.id.as_ref() {
            "show" => {
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
            "hide" => {
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
              }
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .build(app)?;

      // Register global shortcut in Rust backend
      let handle = app.handle().clone();
      app.global_shortcut().on_shortcut(
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyK),
        move |_app, _shortcut, event| {
          if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(window) = handle.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        },
      )?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      copy_image_to_clipboard,
      detect_engines,
      pandoc_to_markdown,
      mineru_to_markdown,
      pymupdf_to_markdown,
      capture_screen,
      get_pixel_color,
      get_color_at_mouse,
      reveal_in_file_manager,
      register_color_pick_shortcut,
      magnifier::start_magnifier,
      magnifier::stop_magnifier,
      magnifier::confirm_color_pick,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
