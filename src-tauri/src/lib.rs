use tauri::{
  image::Image,
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tauri_plugin_clipboard_manager::ClipboardExt;
use base64::Engine;

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
    .invoke_handler(tauri::generate_handler![copy_image_to_clipboard])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
