use crate::db;

#[tauri::command]
pub fn salvar_historico(codigo: String) -> Result<(), String> {
    db::salvar_historico_db(&codigo)
}
