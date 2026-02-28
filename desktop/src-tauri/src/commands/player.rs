// Player nativo via mpv — bypassa completamente o WebView2 para reprodução de vídeo.
//
// Arquitetura (Windows 10/11):
//
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  Tauri WebviewWindow (HWND_TOPMOST, transparent: true)             │
//   │  → WebView2 com background: transparent (body/html via JS)        │
//   │  → React UI: busca, hold-indicator, etc.                          │
//   └─────────────────────────────────────────────────────────────────────┘
//                           ↑  always-on-top (HWND_TOPMOST)
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  Janela Win32 pura ("BKVideoBg") — NÃO topmost                    │
//   │  Colocada antes de elevar o Tauri, cobre o monitor inteiro        │
//   │  mpv renderiza DENTRO dela via --wid=<HWND>                       │
//   └─────────────────────────────────────────────────────────────────────┘
//
// Resultado: o usuário vê o vídeo mpv através das áreas transparentes do WebView2.
//
// Fallback: se mpv não for encontrado, o frontend usa <video> HTML5.

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// ─── Estado ────────────────────────────────────────────────────────────────

pub struct NativePlayerState {
    pub process: Mutex<Option<Child>>,
    /// Handle da janela Win32 de vídeo (0 = nenhuma). Apenas Windows.
    pub video_hwnd: Mutex<isize>,
}

impl NativePlayerState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
            video_hwnd: Mutex::new(0),
        }
    }
}

// ─── Win32 via raw FFI (Windows only) ──────────────────────────────────────
//
// Usamos FFI direto (sem crate externo) para evitar conflitos de versão com
// as dependências internas do Tauri (windows-core).

#[cfg(target_os = "windows")]
mod win_bg {
    use std::sync::mpsc;

    // Tipos Win32 mínimos necessários
    type HWND   = *mut std::ffi::c_void;
    type HINSTANCE = *mut std::ffi::c_void;
    type HBRUSH = *mut std::ffi::c_void;
    type WPARAM = usize;
    type LPARAM = isize;
    type LRESULT = isize;

    const WM_CLOSE:   u32 = 0x0010;
    const WM_DESTROY: u32 = 0x0002;
    const WS_POPUP:   u32 = 0x8000_0000;
    const WS_VISIBLE: u32 = 0x1000_0000;
    const WS_EX_NOACTIVATE:      u32 = 0x0800_0000;
    const WS_EX_NOINHERITLAYOUT: u32 = 0x0010_0000;
    const SW_SHOWNOACTIVATE: i32 = 4;
    const CS_OWNDC: u32 = 0x0020;
    const BLACK_BRUSH: i32 = 4;
    const NULL_HWND: HWND = std::ptr::null_mut();

    #[repr(C)]
    struct WNDCLASSEXW {
        cb_size: u32,
        style: u32,
        lpfn_wnd_proc: Option<unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM) -> LRESULT>,
        cb_cls_extra: i32,
        cb_wnd_extra: i32,
        h_instance: HINSTANCE,
        h_icon: *mut std::ffi::c_void,
        h_cursor: *mut std::ffi::c_void,
        hbr_background: HBRUSH,
        lpsz_menu_name: *const u16,
        lpsz_class_name: *const u16,
        h_icon_sm: *mut std::ffi::c_void,
    }

    #[repr(C)]
    struct MSG {
        hwnd: HWND,
        message: u32,
        w_param: WPARAM,
        l_param: LPARAM,
        time: u32,
        pt_x: i32,
        pt_y: i32,
        l_private: u32,
    }

    #[link(name = "user32")]
    extern "system" {
        fn GetModuleHandleW(lp_module_name: *const u16) -> HINSTANCE;
        fn RegisterClassExW(lpwcx: *const WNDCLASSEXW) -> u16;
        fn CreateWindowExW(
            dw_ex_style: u32, lp_class_name: *const u16, lp_window_name: *const u16,
            dw_style: u32, x: i32, y: i32, n_width: i32, n_height: i32,
            h_wnd_parent: HWND, h_menu: *mut std::ffi::c_void,
            h_instance: HINSTANCE, lp_param: *const std::ffi::c_void,
        ) -> HWND;
        fn ShowWindow(h_wnd: HWND, n_cmd_show: i32) -> i32;
        fn UpdateWindow(h_wnd: HWND) -> i32;
        fn PostMessageW(h_wnd: HWND, msg: u32, w_param: WPARAM, l_param: LPARAM) -> i32;
        fn PostQuitMessage(n_exit_code: i32);
        fn GetMessageW(lp_msg: *mut MSG, h_wnd: HWND, w_msg_filter_min: u32, w_msg_filter_max: u32) -> i32;
        fn TranslateMessage(lp_msg: *const MSG) -> i32;
        fn DispatchMessageW(lp_msg: *const MSG) -> LRESULT;
        fn DefWindowProcW(h_wnd: HWND, msg: u32, w_param: WPARAM, l_param: LPARAM) -> LRESULT;
        fn GetStockObject(i: i32) -> *mut std::ffi::c_void;
    }

    unsafe extern "system" fn wnd_proc(
        hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_DESTROY {
            PostQuitMessage(0);
        }
        DefWindowProcW(hwnd, msg, wparam, lparam)
    }

    /// Encoda uma string Rust como UTF-16 null-terminated
    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    /// Cria a janela Win32 de vídeo em thread dedicada com message loop.
    /// Retorna o HWND como isize (0 = falha).
    pub fn create(x: i32, y: i32, w: i32, h: i32) -> isize {
        let (tx, rx) = mpsc::channel::<isize>();

        std::thread::spawn(move || unsafe {
            let hinstance = GetModuleHandleW(std::ptr::null());
            if hinstance.is_null() {
                log::error!("[win_bg] GetModuleHandleW retornou null");
                tx.send(0).ok();
                return;
            }

            let class_wide = to_wide("BKVideoBg");
            let title_wide = to_wide("");

            let wc = WNDCLASSEXW {
                cb_size: std::mem::size_of::<WNDCLASSEXW>() as u32,
                style: CS_OWNDC,
                lpfn_wnd_proc: Some(wnd_proc),
                cb_cls_extra: 0,
                cb_wnd_extra: 0,
                h_instance: hinstance,
                h_icon: std::ptr::null_mut(),
                h_cursor: std::ptr::null_mut(),
                hbr_background: GetStockObject(BLACK_BRUSH),
                lpsz_menu_name: std::ptr::null(),
                lpsz_class_name: class_wide.as_ptr(),
                h_icon_sm: std::ptr::null_mut(),
            };
            RegisterClassExW(&wc); // ignora erro se já registrada

            let hwnd = CreateWindowExW(
                WS_EX_NOACTIVATE | WS_EX_NOINHERITLAYOUT,
                class_wide.as_ptr(),
                title_wide.as_ptr(),
                WS_POPUP | WS_VISIBLE,
                x, y, w, h,
                NULL_HWND,
                std::ptr::null_mut(),
                hinstance,
                std::ptr::null(),
            );

            if hwnd.is_null() {
                log::error!("[win_bg] CreateWindowExW falhou");
                tx.send(0).ok();
                return;
            }

            ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            UpdateWindow(hwnd);

            log::info!("[win_bg] Janela Win32 criada: HWND={:p}", hwnd);
            tx.send(hwnd as isize).ok();

            // Message loop — necessário para que a janela responda ao sistema
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, NULL_HWND, 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            log::info!("[win_bg] Message loop encerrado: HWND={:p}", hwnd);
        });

        match rx.recv_timeout(std::time::Duration::from_secs(3)) {
            Ok(hwnd) => hwnd,
            Err(_) => {
                log::error!("[win_bg] Timeout aguardando criação da janela");
                0
            }
        }
    }

    /// Destrói a janela Win32 de vídeo.
    pub fn destroy(hwnd: isize) {
        if hwnd != 0 {
            unsafe {
                PostMessageW(hwnd as HWND, WM_CLOSE, 0, 0);
            }
            log::info!("[win_bg] WM_CLOSE enviado: HWND=0x{:x}", hwnd);
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn mpv_exe_name() -> &'static str {
    if cfg!(target_os = "windows") { "mpv.exe" } else { "mpv" }
}

fn find_mpv(app: &AppHandle) -> Option<std::path::PathBuf> {
    let name = mpv_exe_name();

    if let Ok(dir) = app.path().resource_dir() {
        let c = dir.join(name);
        if c.exists() {
            log::info!("[player] mpv em resources: {}", c.display());
            return Some(c);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let c = dir.join(name);
            if c.exists() {
                log::info!("[player] mpv ao lado do exe: {}", c.display());
                return Some(c);
            }
        }
    }
    let sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let found = std::env::var("PATH")
        .ok()?
        .split(sep)
        .map(|d| std::path::PathBuf::from(d).join(name))
        .find(|p| p.exists());
    if let Some(ref p) = found {
        log::info!("[player] mpv no PATH: {}", p.display());
    }
    found
}

/// Retorna (x, y, largura, altura) do monitor onde a janela Tauri está.
fn get_monitor_rect(app: &AppHandle) -> (i32, i32, i32, i32) {
    if let Some(win) = app.get_webview_window("main") {
        if let Ok(Some(monitor)) = win.current_monitor() {
            let pos = monitor.position();
            let size = monitor.size();
            return (pos.x, pos.y, size.width as i32, size.height as i32);
        }
        if let (Ok(pos), Ok(size)) = (win.outer_position(), win.outer_size()) {
            return (pos.x, pos.y, size.width as i32, size.height as i32);
        }
    }
    (0, 0, 1920, 1080)
}

// ─── Comandos Tauri ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn native_player_available(app: AppHandle) -> bool {
    find_mpv(&app).is_some()
}

#[tauri::command]
pub async fn play_native(
    path: String,
    state: State<'_, NativePlayerState>,
    app: AppHandle,
) -> Result<(), String> {
    // Para processo anterior
    {
        let mut proc = state.process.lock().unwrap();
        if let Some(mut child) = proc.take() {
            child.kill().ok();
            child.wait().ok();
        }
    }

    // Destrói janela de vídeo anterior
    {
        let mut hwnd_guard = state.video_hwnd.lock().unwrap();
        #[cfg(target_os = "windows")]
        win_bg::destroy(*hwnd_guard);
        *hwnd_guard = 0;
    }

    let mpv = find_mpv(&app).ok_or_else(|| "mpv não encontrado".to_string())?;
    let (mon_x, mon_y, mon_w, mon_h) = get_monitor_rect(&app);

    log::info!(
        "[player] Monitor: {}x{}+{}+{} | mpv: {}",
        mon_w, mon_h, mon_x, mon_y, mpv.display()
    );

    // ── Windows: cria janela Win32 dedicada → mpv embeda via --wid ───────────
    #[cfg(target_os = "windows")]
    let embed_arg: String = {
        let hwnd = win_bg::create(mon_x, mon_y, mon_w, mon_h);
        if hwnd != 0 {
            *state.video_hwnd.lock().unwrap() = hwnd;
            format!("--wid={}", hwnd)
        } else {
            // Fallback: windowed-fullscreen posicionado no monitor correto
            log::warn!("[player] Fallback: windowed-fullscreen");
            format!("--geometry={}x{}+{}+{}", mon_w, mon_h, mon_x, mon_y)
        }
    };

    // ── Outros SO: windowed-fullscreen com geometria explícita ───────────────
    #[cfg(not(target_os = "windows"))]
    let embed_arg: String = format!("--geometry={}x{}+{}+{}", mon_w, mon_h, mon_x, mon_y);

    let args: Vec<String> = vec![
        path.clone(),
        "--no-border".into(),
        "--no-osc".into(),
        "--no-osd-bar".into(),
        "--no-osd-msg1".into(),
        "--no-input-default-bindings".into(),
        "--no-input-vo-keyboard".into(),
        "--no-terminal".into(),
        "--volume=100".into(),
        "--keep-open=no".into(),
        "--force-window=yes".into(),
        "--audio-device=auto".into(),
        "--ontop=no".into(),      // mpv NÃO fica topmost — Tauri fica acima
        // Garante frame completo sem corte — legendas de karaokê são parte do vídeo
        "--keepaspect=yes".into(),
        "--panscan=0".into(),
        "--video-zoom=0".into(),
        "--video-pan-x=0".into(),
        "--video-pan-y=0".into(),
        embed_arg,
    ];

    // Fora do Windows, acrescenta fullscreen de sistema
    #[cfg(not(target_os = "windows"))]
    let args = { let mut a = args; a.push("--fullscreen".into()); a };

    log::info!("[player] Iniciando mpv: {:?}", args);

    // Eleva a janela Tauri ANTES de iniciar o mpv: a janela Win32 de vídeo
    // já existe e está na posição correta — não precisa esperar o mpv carregar.
    if let Some(win) = app.get_webview_window("main") {
        win.set_always_on_top(true).ok();
        win.set_focus().ok();
        log::info!("[player] Tauri definida como HWND_TOPMOST");
    }

    let child = Command::new(&mpv)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Erro ao iniciar mpv: {e}"))?;

    *state.process.lock().unwrap() = Some(child);

    Ok(())
}

#[tauri::command]
pub fn stop_native(state: State<'_, NativePlayerState>, app: AppHandle) {
    {
        let mut proc = state.process.lock().unwrap();
        if let Some(mut child) = proc.take() {
            child.kill().ok();
            child.wait().ok();
        }
    }
    {
        let mut hwnd_guard = state.video_hwnd.lock().unwrap();
        #[cfg(target_os = "windows")]
        win_bg::destroy(*hwnd_guard);
        *hwnd_guard = 0;
    }
    if let Some(win) = app.get_webview_window("main") {
        win.set_always_on_top(false).ok();
    }
    log::info!("[player] Playback nativo encerrado");
}

#[tauri::command]
pub fn native_player_ended(state: State<'_, NativePlayerState>) -> bool {
    let mut proc = state.process.lock().unwrap();
    if let Some(child) = proc.as_mut() {
        match child.try_wait() {
            Ok(Some(_)) => {
                *proc = None;
                true
            }
            _ => false,
        }
    } else {
        true
    }
}
