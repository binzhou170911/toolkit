use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

static MAGNIFIER_ACTIVE: AtomicBool = AtomicBool::new(false);
static CAPTURE_THREAD: Mutex<Option<std::thread::JoinHandle<()>>> = Mutex::new(None);

#[derive(Clone, serde::Serialize)]
struct PixelColor {
  r: u8,
  g: u8,
  b: u8,
}

#[derive(Clone, serde::Serialize)]
struct MagnifierData {
  pixels: Vec<PixelColor>,
  grid_size: i32,
  scale: i32,
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
  Ok((0, 0))
}

fn capture_area_around(cx: i32, cy: i32, width: i32, height: i32) -> Vec<PixelColor> {
  #[cfg(target_os = "macos")]
  {
    use core_graphics::display::CGDisplay;
    use core_graphics::geometry::{CGPoint, CGRect, CGSize};

    let display = CGDisplay::main();
    let half_w = width / 2;
    let half_h = height / 2;

    // Use CGDisplayCreateImageForRect to capture a specific area
    let rect = CGRect::new(
      &CGPoint::new((cx - half_w) as f64, (cy - half_h) as f64),
      &CGSize::new(width as f64, height as f64),
    );

    if let Some(image) = display.image_for_rect(rect) {
      let data = image.data();
      let bytes_per_row = image.bytes_per_row() as usize;
      let bpp = image.bits_per_pixel() as usize;
      let img_w = image.width() as usize;
      let buffer = data.bytes();

      let scale_factor = if width > 0 { img_w / width as usize } else { 1 };
      let scale_factor = scale_factor.max(1);
      let mut pixels = Vec::with_capacity((width * height) as usize);

      for y in 0..height as usize {
        for x in 0..width as usize {
          let sx = x * scale_factor;
          let sy = y * scale_factor;
          let offset = sy * bytes_per_row + sx * (bpp / 8);
          if offset + 2 < buffer.len() {
            pixels.push(PixelColor {
              r: buffer[offset + 2],
              g: buffer[offset + 1],
              b: buffer[offset],
            });
          } else {
            pixels.push(PixelColor { r: 0, g: 0, b: 0 });
          }
        }
      }
      return pixels;
    }

    vec![PixelColor { r: 0, g: 0, b: 0 }; (width * height) as usize]
  }
  #[cfg(not(target_os = "macos"))]
  {
    vec![PixelColor { r: 0, g: 0, b: 0 }; (width * height) as usize]
  }
}

fn get_screen_bounds() -> (i32, i32) {
  #[cfg(target_os = "macos")]
  {
    use core_graphics::display::CGDisplay;
    let display = CGDisplay::main();
    let bounds = display.bounds();
    (bounds.size.width as i32, bounds.size.height as i32)
  }
  #[cfg(not(target_os = "macos"))]
  (1920, 1080)
}

fn compute_magnifier_position(cursor_x: i32, cursor_y: i32, win_size: i32) -> (i32, i32) {
  let offset = 20;
  let (screen_w, screen_h) = get_screen_bounds();

  let x = if cursor_x + offset + win_size > screen_w {
    cursor_x - win_size - offset
  } else {
    cursor_x + offset
  };

  let y = if cursor_y + offset + win_size > screen_h {
    cursor_y - win_size - offset
  } else {
    cursor_y + offset
  };

  (x, y)
}

pub fn get_pixel_color_sync(x: i32, y: i32) -> Result<String, String> {
  let pixels = capture_area_around(x, y, 1, 1);
  if let Some(p) = pixels.first() {
    log::info!("Pixel at ({}, {}): R={}, G={}, B={}", x, y, p.r, p.g, p.b);
    Ok(format!("#{:02x}{:02x}{:02x}", p.r, p.g, p.b))
  } else {
    Err("Failed to read pixel color".to_string())
  }
}

#[tauri::command]
pub async fn start_magnifier(app: tauri::AppHandle) -> Result<(), String> {
  if MAGNIFIER_ACTIVE.load(Ordering::Relaxed) {
    return Ok(());
  }

  MAGNIFIER_ACTIVE.store(true, Ordering::Relaxed);

  // Get main window URL and append #magnifier
  let magnifier_url = if cfg!(debug_assertions) {
    // In dev mode, get the dev server URL from the main window
    let main_url = app.get_webview_window("main")
      .and_then(|w| w.url().ok())
      .map(|u| u.to_string())
      .unwrap_or_else(|| "http://localhost:5173".to_string());
    format!("{}#magnifier", main_url)
  } else {
    "tauri://localhost/#magnifier".to_string()
  };

  log::info!("Creating magnifier window with URL: {}", magnifier_url);

  // Create magnifier window
  let _magnifier = WebviewWindowBuilder::new(
    &app,
    "magnifier",
    WebviewUrl::App(magnifier_url.into()),
  )
  .title("取色器")
  .inner_size(300.0, 300.0)
  .decorations(false)
  .transparent(true)
  .always_on_top(true)
  .skip_taskbar(true)
  .resizable(false)
  .closable(false)
  .minimizable(false)
  .maximizable(false)
  .visible(true)
  .build()
  .map_err(|e| format!("Failed to create magnifier window: {}", e))?;

  // Spawn capture thread
  let handle = app.clone();
  let capture_handle = std::thread::spawn(move || {
    let grid_size = 11;
    let win_size = 300;

    while MAGNIFIER_ACTIVE.load(Ordering::Relaxed) {
      // Get mouse position
      let (mx, my) = match get_mouse_position() {
        Ok(pos) => pos,
        Err(_) => {
          std::thread::sleep(Duration::from_millis(16));
          continue;
        }
      };

      // Capture pixels around cursor
      let pixels = capture_area_around(mx, my, grid_size, grid_size);

      // Compute magnifier window position
      let (win_x, win_y) = compute_magnifier_position(mx, my, win_size);

      // Move magnifier window and emit pixel data
      if let Some(win) = handle.get_webview_window("magnifier") {
        let _ = win.set_position(tauri::Position::Physical(
          tauri::PhysicalPosition::new(win_x, win_y),
        ));

        let _ = win.emit("magnifier-pixels", MagnifierData {
          pixels,
          grid_size,
          scale: 24,
        });
      } else {
        break;
      }

      std::thread::sleep(Duration::from_millis(16));
    }

    log::info!("Capture thread stopped");
  });

  *CAPTURE_THREAD.lock().unwrap() = Some(capture_handle);

  Ok(())
}

#[tauri::command]
pub async fn stop_magnifier(app: tauri::AppHandle) -> Result<(), String> {
  MAGNIFIER_ACTIVE.store(false, Ordering::Relaxed);

  if let Some(handle) = CAPTURE_THREAD.lock().unwrap().take() {
    let _ = handle.join();
  }

  if let Some(win) = app.get_webview_window("magnifier") {
    let _ = win.destroy();
  }

  Ok(())
}

#[tauri::command]
pub async fn confirm_color_pick(app: tauri::AppHandle) -> Result<String, String> {
  let magnifier = app.get_webview_window("magnifier")
    .ok_or("Magnifier window not found")?;

  let magnifier_pos = magnifier.outer_position()
    .map_err(|e| e.to_string())?;
  let magnifier_size = magnifier.outer_size()
    .map_err(|e| e.to_string())?;

  // The target pixel is at the center of the magnifier
  let target_x = magnifier_pos.x + (magnifier_size.width as i32 / 2);
  let target_y = magnifier_pos.y + (magnifier_size.height as i32 / 2);

  log::info!("Confirm pick at magnifier center: ({}, {})", target_x, target_y);

  let color = get_pixel_color_sync(target_x, target_y)?;

  // Emit to main window
  if let Some(main) = app.get_webview_window("main") {
    let _ = main.emit("color-picked", color.clone());
    let _ = main.show();
    let _ = main.set_focus();
  }

  // Stop magnifier
  MAGNIFIER_ACTIVE.store(false, Ordering::Relaxed);
  if let Some(handle) = CAPTURE_THREAD.lock().unwrap().take() {
    let _ = handle.join();
  }
  let _ = magnifier.destroy();

  Ok(color)
}
