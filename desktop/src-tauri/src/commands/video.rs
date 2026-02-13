use crate::AppState;
use std::path::Path;

/// Tenta código exato, depois com 5 dígitos (1009 → 01009), depois sem zeros à esquerda.
fn codigo_variantes(codigo: &str) -> Vec<String> {
    let mut out = vec![codigo.to_string()];
    if !codigo.chars().all(|c| c.is_ascii_digit()) {
        return out;
    }
    let padded = format!("{:0>5}", codigo);
    if padded != codigo {
        out.push(padded);
    }
    let trimmed = codigo.trim_start_matches('0');
    let trimmed = if trimmed.is_empty() { "0" } else { trimmed };
    if trimmed != codigo {
        out.push(trimmed.to_string());
    }
    out
}

#[tauri::command]
pub fn get_video_path(codigo: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let data_dir = &state.data_dir;
    let musicas_dir = Path::new(data_dir).join("musicas");
    let codigo = codigo.trim();
    // Normalizar código numérico para 5 dígitos (1009 → 01009), igual à pasta musicas
    let codigo = if codigo.chars().all(|c| c.is_ascii_digit()) && codigo.len() >= 4 && codigo.len() <= 5 {
        format!("{:0>5}", codigo)
    } else {
        codigo.to_string()
    };

    for variante in codigo_variantes(&codigo) {
        let video_path = musicas_dir.join(format!("{}.mp4", variante));
        if video_path.exists() {
            return Ok(video_path.to_string_lossy().to_string());
        }
    }

    Err(format!("Video not found: {}", codigo))
}
