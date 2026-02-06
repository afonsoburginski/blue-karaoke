use crate::AppState;
use std::path::Path;

#[tauri::command]
pub fn get_video_path(codigo: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let data_dir = &state.data_dir;
    let video_path = Path::new(data_dir).join("musicas").join(format!("{}.mp4", codigo));
    
    if video_path.exists() {
        Ok(video_path.to_string_lossy().to_string())
    } else {
        Err(format!("Video not found: {}", codigo))
    }
}
