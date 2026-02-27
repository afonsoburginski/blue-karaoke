// Player nativo via mpv — bypassa completamente o WebView2 para reprodução de vídeo.
//
// Estratégia (Windows 10/11):
//   1. mpv roda em fullscreen normal (não topmost)
//   2. Janela Tauri é colocada como HWND_TOPMOST (always-on-top) e transparente
//   3. O vídeo do mpv aparece visível através do WebView2 transparente
//   4. A UI React (overlay de busca, hold indicator) fica por cima do vídeo
//   5. Quando mpv termina (processo encerra), o frontend detecta e navega para /nota
//
// Fallback: se mpv não for encontrado, o frontend usa <video> HTML5.

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct NativePlayerState {
    pub process: Mutex<Option<Child>>,
}

impl NativePlayerState {
    pub fn new() -> Self {
        Self { process: Mutex::new(None) }
    }
}

fn mpv_exe_name() -> &'static str {
    if cfg!(target_os = "windows") { "mpv.exe" } else { "mpv" }
}

/// Procura mpv em: 1) recursos bundled, 2) pasta do exe, 3) PATH
fn find_mpv(app: &AppHandle) -> Option<std::path::PathBuf> {
    let name = mpv_exe_name();

    // 1. Recursos bundled pelo Tauri (pasta resources/ no instalador)
    if let Ok(dir) = app.path().resource_dir() {
        let candidate = dir.join(name);
        if candidate.exists() {
            log::info!("[player] mpv encontrado em resources: {}", candidate.display());
            return Some(candidate);
        }
    }

    // 2. Pasta ao lado do executável (portable/dev)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join(name);
            if candidate.exists() {
                log::info!("[player] mpv encontrado ao lado do exe: {}", candidate.display());
                return Some(candidate);
            }
        }
    }

    // 3. PATH do sistema
    let sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let found = std::env::var("PATH").ok()?.split(sep)
        .map(|d| std::path::PathBuf::from(d).join(name))
        .find(|p| p.exists());

    if let Some(ref p) = found {
        log::info!("[player] mpv encontrado no PATH: {}", p.display());
    }
    found
}

/// Retorna true se mpv está disponível no sistema (resources, exe dir, ou PATH).
#[tauri::command]
pub fn native_player_available(app: AppHandle) -> bool {
    find_mpv(&app).is_some()
}

/// Inicia reprodução via mpv.
/// mpv abre em fullscreen abaixo da janela Tauri (que fica always-on-top + transparente).
#[tauri::command]
pub async fn play_native(
    path: String,
    state: State<'_, NativePlayerState>,
    app: AppHandle,
) -> Result<(), String> {
    // Encerrar playback anterior
    {
        let mut lock = state.process.lock().unwrap();
        if let Some(mut child) = lock.take() {
            child.kill().ok();
            child.wait().ok();
        }
    }

    let mpv = find_mpv(&app).ok_or_else(|| "mpv não encontrado".to_string())?;

    log::info!("[player] Iniciando mpv: {} {:?}", mpv.display(), path);

    let child = Command::new(&mpv)
        .args([
            path.as_str(),
            "--no-border",          // sem bordas/título
            "--no-osc",             // sem controles on-screen
            "--no-osd-bar",         // sem barra de progresso
            "--no-osd-msg1",        // sem mensagem de arquivo carregado
            "--no-input-default-bindings", // mpv NÃO captura teclado
            "--no-input-vo-keyboard",      // mpv NÃO captura teclado no VO
            "--no-terminal",        // sem saída no terminal
            "--fullscreen",         // janela fullscreen (não topmost)
            "--volume=100",
            "--keep-open=no",       // encerra ao terminar o vídeo
            "--force-window=yes",   // garante que a janela seja criada
            "--audio-device=auto",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Erro ao iniciar mpv: {e}"))?;

    {
        let mut lock = state.process.lock().unwrap();
        *lock = Some(child);
    }

    // Aguarda mpv criar sua janela, depois eleva a janela Tauri para cima dele
    tokio::time::sleep(std::time::Duration::from_millis(400)).await;

    if let Some(win) = app.get_webview_window("main") {
        // always-on-top garante que o WebView2 (transparente) fique sobre o mpv
        win.set_always_on_top(true).ok();
        win.set_focus().ok();
        log::info!("[player] Janela Tauri definida como always-on-top");
    }

    Ok(())
}

/// Para a reprodução nativa e restaura o estado da janela.
#[tauri::command]
pub fn stop_native(state: State<'_, NativePlayerState>, app: AppHandle) {
    {
        let mut lock = state.process.lock().unwrap();
        if let Some(mut child) = lock.take() {
            child.kill().ok();
            child.wait().ok();
        }
    }
    // Restaura janela: remove always-on-top
    if let Some(win) = app.get_webview_window("main") {
        win.set_always_on_top(false).ok();
    }
    log::info!("[player] Playback nativo encerrado");
}

/// Verifica se o processo mpv já terminou (vídeo acabou ou foi parado).
/// Retorna true quando pode navegar para /nota.
#[tauri::command]
pub fn native_player_ended(state: State<'_, NativePlayerState>) -> bool {
    let mut lock = state.process.lock().unwrap();
    if let Some(child) = lock.as_mut() {
        match child.try_wait() {
            Ok(Some(_)) => {
                *lock = None; // limpa o processo encerrado
                true
            }
            _ => false,
        }
    } else {
        true // nenhum processo = considerado encerrado
    }
}
