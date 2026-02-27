mod commands;
mod db;
mod supabase;

use tauri::Manager;
use commands::player::NativePlayerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .manage(NativePlayerState::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Initialize database
            let data_dir = get_data_dir(app.handle());
            std::fs::create_dir_all(&data_dir).ok();
            
            // Load env file for Supabase credentials
            // Priority: 1) bundled resource dir, 2) data dir, 3) dev project root
            #[cfg(debug_assertions)]
            {
                let dev_env = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
                if dev_env.exists() {
                    supabase::load_env_file(&env!("CARGO_MANIFEST_DIR").to_string());
                } else {
                    supabase::load_env_file(&data_dir);
                }
            }
            #[cfg(not(debug_assertions))]
            {
                // Try bundled resource directory first (included in installer)
                if let Ok(resource_dir) = app.path().resource_dir() {
                    let resource_env = resource_dir.join(".env");
                    if resource_env.exists() {
                        log::info!("Loading .env from resource dir: {}", resource_dir.display());
                        supabase::load_env_file(&resource_dir.to_string_lossy());
                    }
                }
                // Also try exe directory (portable mode)
                if let Ok(exe_path) = std::env::current_exe() {
                    if let Some(exe_dir) = exe_path.parent() {
                        let exe_env = exe_dir.join(".env");
                        if exe_env.exists() {
                            log::info!("Loading .env from exe dir: {}", exe_dir.display());
                            supabase::load_env_file(&exe_dir.to_string_lossy());
                        }
                    }
                }
                // Also try data directory
                supabase::load_env_file(&data_dir);
            }
            
            db::init_db(&data_dir).expect("Failed to initialize database");
            
            // Store data dir in app state
            app.manage(AppState {
                data_dir: data_dir.clone(),
            });

            log::info!("Blue Karaoke started. Data dir: {}", data_dir);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::musicas::buscar_musicas,
            commands::musicas::get_musica_by_codigo,
            commands::musicas::musica_aleatoria,
            commands::musicas::get_all_musicas_count,
            commands::historico::salvar_historico,
            commands::ativacao::verificar_ativacao,
            commands::ativacao::validar_chave,
            commands::ativacao::remover_ativacao,
            commands::sync::get_offline_status,
            commands::sync::download_batch,
            commands::sync::reindex_musicas,
            commands::video::get_video_path,
            commands::player::native_player_available,
            commands::player::play_native,
            commands::player::stop_native,
            commands::player::native_player_ended,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub struct AppState {
    pub data_dir: String,
}

fn get_data_dir(_handle: &tauri::AppHandle) -> String {
    // Em dev: usar sempre target/debug/data do projeto (onde estão db e musicas)
    #[cfg(debug_assertions)]
    {
        let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let path = manifest.join("target").join("debug").join("data");
        let s = path.to_string_lossy().to_string();
        log::info!("Data dir (dev): {}", s);
        return s;
    }

    // Produção: preferir AppData (gravável no Windows mesmo com exe em Program Files); depois pasta "data" ao lado do exe (portable)
    #[cfg(not(debug_assertions))]
    if let Ok(app_dir) = _handle.path().app_data_dir() {
        let path = app_dir.to_string_lossy().to_string();
        log::info!("Data dir (AppData): {}", path);
        return path;
    }

    #[cfg(not(debug_assertions))]
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let path = exe_dir.join("data").to_string_lossy().to_string();
            log::info!("Data dir (exe): {}", path);
            return path;
        }
    }

    #[cfg(not(debug_assertions))]
    dirs::data_dir()
        .map(|d| d.join("blue-karaoke").to_string_lossy().to_string())
        .unwrap_or_else(|| "data".to_string())
}
