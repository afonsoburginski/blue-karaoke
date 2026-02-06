mod commands;
mod db;
mod supabase;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub struct AppState {
    pub data_dir: String,
}

fn get_data_dir(handle: &tauri::AppHandle) -> String {
    // Try portable mode first (data/ next to exe)
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
        let portable_dir = exe_dir.join("data");
        if let Ok(_) = std::fs::create_dir_all(&portable_dir) {
            return portable_dir.to_string_lossy().to_string();
        }
    }

    // Fallback to app data dir
    if let Some(app_dir) = handle.path().app_data_dir().ok() {
        return app_dir.to_string_lossy().to_string();
    }

    // Last resort
    dirs::data_dir()
        .map(|d| d.join("blue-karaoke").to_string_lossy().to_string())
        .unwrap_or_else(|| "data".to_string())
}
