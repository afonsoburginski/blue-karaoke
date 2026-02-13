use crate::db;
use crate::AppState;
use std::path::Path;

/// Variações do código para busca (1001 <-> 01001)
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
pub fn buscar_musicas(query: String) -> Result<Vec<db::MusicaSimple>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }
    db::buscar_musicas_db(&query)
}

#[tauri::command]
pub fn get_musica_by_codigo(codigo: String, state: tauri::State<'_, AppState>) -> Result<Option<db::MusicaSimple>, String> {
    let codigo = codigo.trim();
    // Normalizar código numérico para 5 dígitos (1009 → 01009) para consistência com a base
    let codigo = if codigo.chars().all(|c| c.is_ascii_digit()) && codigo.len() >= 4 && codigo.len() <= 5 {
        format!("{:0>5}", codigo)
    } else {
        codigo.to_string()
    };
    if let Some(m) = db::get_musica_by_codigo_db(&codigo)? {
        return Ok(Some(m));
    }
    // Fallback: arquivo existe na pasta mas não está no banco (ex.: 01001.mp4)
    let musicas_dir = Path::new(&state.data_dir).join("musicas");
    for variante in codigo_variantes(&codigo) {
        let path = musicas_dir.join(format!("{}.mp4", variante));
        if path.exists() {
            let arquivo = path.to_string_lossy().to_string();
            return Ok(Some(db::MusicaSimple {
                codigo: variante.clone(),
                artista: "Desconhecido".to_string(),
                titulo: variante,
                arquivo,
            }));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn musica_aleatoria() -> Result<Option<String>, String> {
    db::musica_aleatoria_db()
}

#[tauri::command]
pub fn get_all_musicas_count() -> Result<i64, String> {
    db::count_musicas_local()
}
