use crate::db;

#[tauri::command]
pub fn buscar_musicas(query: String) -> Result<Vec<db::MusicaSimple>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }
    db::buscar_musicas_db(&query)
}

#[tauri::command]
pub fn get_musica_by_codigo(codigo: String) -> Result<Option<db::MusicaSimple>, String> {
    db::get_musica_by_codigo_db(&codigo)
}

#[tauri::command]
pub fn musica_aleatoria() -> Result<Option<String>, String> {
    db::musica_aleatoria_db()
}

#[tauri::command]
pub fn get_all_musicas_count() -> Result<i64, String> {
    db::count_musicas_local()
}
