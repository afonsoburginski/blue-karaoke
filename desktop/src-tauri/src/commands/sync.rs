use crate::db;
use crate::supabase;
use crate::AppState;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct OfflineStatus {
    #[serde(rename = "totalMusicas")]
    pub total_musicas: i64,
    #[serde(rename = "musicasOffline")]
    pub musicas_offline: i64,
    #[serde(rename = "musicasOnline")]
    pub musicas_online: i64,
    #[serde(rename = "storageUsed")]
    pub storage_used: i64,
    #[serde(rename = "storageUsedMB")]
    pub storage_used_mb: f64,
}

#[tauri::command]
pub async fn get_offline_status(state: tauri::State<'_, AppState>) -> Result<OfflineStatus, String> {
    let local_count = db::count_musicas_local()?;
    let storage = db::storage_used()?;
    
    let mut total = local_count;
    let mut online_only = 0i64;
    
    // Try to get remote count
    if let Ok(remote) = supabase::fetch_all_musicas().await {
        total = remote.len() as i64;
        online_only = (total - local_count).max(0);
    }
    
    Ok(OfflineStatus {
        total_musicas: total,
        musicas_offline: local_count,
        musicas_online: online_only,
        storage_used: storage,
        storage_used_mb: storage as f64 / (1024.0 * 1024.0),
    })
}

#[derive(Serialize)]
pub struct DownloadResult {
    pub downloaded: i32,
    pub remaining: i64,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn download_batch(size: Option<i32>, state: tauri::State<'_, AppState>) -> Result<DownloadResult, String> {
    let batch_size = size.unwrap_or(3);
    let data_dir = &state.data_dir;
    let musicas_dir = Path::new(data_dir).join("musicas");
    std::fs::create_dir_all(&musicas_dir).map_err(|e| e.to_string())?;
    
    // Fetch all remote musicas
    let remote = supabase::fetch_all_musicas().await?;
    
    // Filter to ones not downloaded yet
    let mut pending = Vec::new();
    for m in &remote {
        let local_path = musicas_dir.join(format!("{}.mp4", m.codigo));
        if !local_path.exists() || !db::musica_existe(&m.codigo).unwrap_or(true) {
            pending.push(m);
        }
    }
    
    let total_remaining = pending.len() as i64;
    let batch: Vec<_> = pending.into_iter().take(batch_size as usize).collect();
    
    log::info!("Downloading batch: {} of {} pending", batch.len(), total_remaining);
    
    let mut downloaded = 0;
    let mut errors = Vec::new();
    
    for musica in batch {
        let dest = musicas_dir.join(format!("{}.mp4", musica.codigo));
        let dest_str = dest.to_string_lossy().to_string();
        
        match supabase::download_file(&musica.arquivo, &dest_str).await {
            Ok(size) => {
                // Insert into local DB
                let db_musica = db::Musica {
                    id: musica.id.clone(),
                    codigo: musica.codigo.clone(),
                    artista: musica.artista.clone(),
                    titulo: musica.titulo.clone(),
                    arquivo: dest_str,
                    nome_arquivo: musica.nome_arquivo.clone(),
                    tamanho: Some(size as i64),
                    duracao: musica.duracao.as_ref().and_then(|v| v.as_i64()),
                    user_id: musica.user_id.clone(),
                };
                
                match db::insert_musica(&db_musica) {
                    Ok(_) => {
                        log::info!("[DOWNLOAD] {} downloaded ({} bytes)", musica.codigo, size);
                        downloaded += 1;
                    }
                    Err(e) => {
                        // Rollback: delete file if DB insert failed
                        std::fs::remove_file(&dest).ok();
                        errors.push(format!("{}: DB error: {}", musica.codigo, e));
                    }
                }
            }
            Err(e) => {
                errors.push(format!("{}: {}", musica.codigo, e));
            }
        }
    }
    
    Ok(DownloadResult {
        downloaded,
        remaining: total_remaining - downloaded as i64,
        errors,
    })
}

#[derive(Serialize)]
pub struct ReindexResult {
    pub total: i32,
    pub reindexed: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn reindex_musicas(state: tauri::State<'_, AppState>) -> Result<ReindexResult, String> {
    let data_dir = &state.data_dir;
    let musicas_dir = Path::new(data_dir).join("musicas");
    
    if !musicas_dir.exists() {
        return Ok(ReindexResult { total: 0, reindexed: 0, errors: vec![] });
    }
    
    let files: Vec<_> = std::fs::read_dir(&musicas_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "mp4").unwrap_or(false))
        .collect();
    
    let total = files.len() as i32;
    let mut reindexed = 0;
    let mut errors = Vec::new();
    
    // Get remote data for reindexing
    let remote = match supabase::fetch_all_musicas().await {
        Ok(r) => r,
        Err(e) => {
            return Ok(ReindexResult { total, reindexed: 0, errors: vec![format!("Offline: {}", e)] });
        }
    };
    
    for file in &files {
        let codigo = file.path().file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        
        if codigo.is_empty() { continue; }
        
        // Skip if already in DB
        if db::musica_existe(&codigo).unwrap_or(true) { continue; }
        
        // Find in remote data
        if let Some(musica) = remote.iter().find(|m| m.codigo == codigo) {
            let file_path = file.path().to_string_lossy().to_string();
            let size = std::fs::metadata(file.path()).map(|m| m.len() as i64).unwrap_or(0);
            
            let db_musica = db::Musica {
                id: musica.id.clone(),
                codigo: musica.codigo.clone(),
                artista: musica.artista.clone(),
                titulo: musica.titulo.clone(),
                arquivo: file_path,
                nome_arquivo: musica.nome_arquivo.clone(),
                tamanho: Some(size),
                duracao: musica.duracao.as_ref().and_then(|v| v.as_i64()),
                user_id: musica.user_id.clone(),
            };
            
            match db::insert_musica(&db_musica) {
                Ok(_) => {
                    log::info!("[REINDEX] {} indexed", codigo);
                    reindexed += 1;
                }
                Err(e) => errors.push(format!("{}: {}", codigo, e)),
            }
        }
    }
    
    Ok(ReindexResult { total, reindexed, errors })
}
