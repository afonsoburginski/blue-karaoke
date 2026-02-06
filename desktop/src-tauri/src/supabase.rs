use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

static CLIENT: OnceLock<Client> = OnceLock::new();

fn client() -> &'static Client {
    CLIENT.get_or_init(|| Client::new())
}

// Supabase config - loaded from env file or hardcoded for the karaoke app
fn supabase_url() -> String {
    std::env::var("SUPABASE_URL").unwrap_or_else(|_| {
        std::env::var("NEXT_PUBLIC_SUPABASE_URL").unwrap_or_default()
    })
}

fn supabase_key() -> String {
    std::env::var("SUPABASE_ANON_KEY")
        .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
        .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"))
        .unwrap_or_default()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupabaseMusica {
    pub id: String,
    pub codigo: String,
    pub artista: String,
    pub titulo: String,
    pub arquivo: String,
    pub nome_arquivo: Option<String>,
    pub tamanho: Option<serde_json::Value>,
    pub duracao: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupabaseChave {
    pub id: String,
    pub chave: String,
    #[serde(default)]
    pub tipo: String,
    #[serde(default)]
    pub status: String,
    pub data_expiracao: Option<String>,
    pub data_inicio: Option<String>,
    pub limite_tempo: Option<f64>,
    pub user_id: Option<serde_json::Value>,
    pub ultimo_uso: Option<String>,
    // Accept any extra fields from Supabase without failing
    #[serde(flatten)]
    pub extra: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupabaseAssinatura {
    pub id: String,
    pub user_id: String,
    pub status: String,
    pub data_fim: Option<String>,
}

/// Fetch all musicas from Supabase
pub async fn fetch_all_musicas() -> Result<Vec<SupabaseMusica>, String> {
    let url = supabase_url();
    let key = supabase_key();
    log::info!("[SUPABASE] URL: {}, Key length: {}", url, key.len());
    if url.is_empty() || key.is_empty() {
        return Err("Supabase not configured".to_string());
    }

    let full_url = format!("{}/rest/v1/musicas?select=*", url);
    log::info!("[SUPABASE] Fetching: {}", full_url);

    let resp = client()
        .get(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| {
            log::error!("[SUPABASE] Request error: {}", e);
            e.to_string()
        })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        log::error!("[SUPABASE] Error {}: {}", status, body);
        return Err(format!("Supabase error {}: {}", status, body));
    }

    let text = resp.text().await.map_err(|e| e.to_string())?;
    log::info!("[SUPABASE] Response length: {} chars", text.len());
    
    serde_json::from_str::<Vec<SupabaseMusica>>(&text)
        .map_err(|e| {
            log::error!("[SUPABASE] Parse error: {}. First 200 chars: {}", e, &text[..text.len().min(200)]);
            format!("Parse error: {}", e)
        })
}

/// Validate activation key via Supabase
pub async fn validar_chave_supabase(chave: &str) -> Result<Option<SupabaseChave>, String> {
    let url = supabase_url();
    let key = supabase_key();
    if url.is_empty() || key.is_empty() {
        return Err("Supabase not configured".to_string());
    }

    let resp = client()
        .get(format!(
            "{}/rest/v1/chaves_ativacao?chave=eq.{}&select=*",
            url, chave
        ))
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Supabase error: {}", resp.status()));
    }

    let chaves: Vec<SupabaseChave> = resp.json().await.map_err(|e| e.to_string())?;
    Ok(chaves.into_iter().next())
}

/// Check subscription status
pub async fn check_assinatura(user_id: &str) -> Result<Option<SupabaseAssinatura>, String> {
    let url = supabase_url();
    let key = supabase_key();

    let resp = client()
        .get(format!(
            "{}/rest/v1/assinaturas?user_id=eq.{}&status=eq.ativa&select=*",
            url, user_id
        ))
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let assinaturas: Vec<SupabaseAssinatura> = resp.json().await.map_err(|e| e.to_string())?;
    Ok(assinaturas.into_iter().next())
}

/// Update last use timestamp for a key
pub async fn update_ultimo_uso(chave_id: &str) -> Result<(), String> {
    let url = supabase_url();
    let key = supabase_key();

    let now = chrono::Utc::now().to_rfc3339();
    client()
        .patch(format!(
            "{}/rest/v1/chaves_ativacao?id=eq.{}",
            url, chave_id
        ))
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&serde_json::json!({ "ultimo_uso": now }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Download a file from URL
pub async fn download_file(url: &str, dest: &str) -> Result<u64, String> {
    let resp = client()
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Download failed: {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let size = bytes.len() as u64;
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())?;
    Ok(size)
}

/// Load env from .env file in data dir
pub fn load_env_file(data_dir: &str) {
    let env_files = [".env", ".env.local", "env.txt"];
    for name in &env_files {
        let path = std::path::Path::new(data_dir).join(name);
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        continue;
                    }
                    if let Some(eq_pos) = trimmed.find('=') {
                        let key = trimmed[..eq_pos].trim();
                        let value = trimmed[eq_pos + 1..].trim().trim_matches(|c| c == '"' || c == '\'');
                        if !key.is_empty() {
                            std::env::set_var(key, value);
                        }
                    }
                }
                log::info!("Loaded env from {:?}", path);
                break;
            }
        }
    }
}
