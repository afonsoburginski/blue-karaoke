use crate::db;
use crate::supabase;
use serde::Serialize;

#[derive(Serialize)]
pub struct AtivacaoStatus {
    pub ativada: bool,
    pub expirada: bool,
    pub modo: String,
    pub chave: Option<String>,
    /// "maquina" ou "assinatura" - usado no frontend para input numérico no modo máquina
    pub tipo: String,
    #[serde(rename = "diasRestantes")]
    pub dias_restantes: Option<i64>,
    #[serde(rename = "horasRestantes")]
    pub horas_restantes: Option<f64>,
}

#[tauri::command]
pub async fn verificar_ativacao() -> Result<AtivacaoStatus, String> {
    // Check local first
    let ativacao = db::get_ativacao()?;
    
    match ativacao {
        None => Ok(AtivacaoStatus {
            ativada: false,
            expirada: false,
            modo: "offline".to_string(),
            chave: None,
            tipo: "assinatura".to_string(),
            dias_restantes: None,
            horas_restantes: None,
        }),
        Some(atv) => {
            // Always try online validation first (Supabase is source of truth)
            // This updates the local SQLite with fresh data (admin may have added days)
            if let Ok(online) = try_online_validation(&atv.chave).await {
                log::info!("[ATIVACAO] Online validation succeeded: dias={:?}, horas={:?}", 
                    online.dias_restantes, online.horas_restantes);
                return Ok(online);
            }
            
            log::info!("[ATIVACAO] Offline mode - using local data");
            
            // Offline: use local SQLite data
            let now = chrono::Utc::now().timestamp_millis();
            
            if atv.tipo == "assinatura" {
                if let Some(exp) = atv.data_expiracao {
                    if exp < now {
                        return Ok(AtivacaoStatus {
                            ativada: false,
                            expirada: true,
                            modo: "offline".to_string(),
                            chave: Some(atv.chave.clone()),
                            tipo: atv.tipo.clone(),
                            dias_restantes: Some(0),
                            horas_restantes: None,
                        });
                    }
                    let diff = exp - now;
                    let dias = (diff as f64 / (1000.0 * 60.0 * 60.0 * 24.0)).ceil() as i64;
                    
                    return Ok(AtivacaoStatus {
                        ativada: true,
                        expirada: false,
                        modo: "offline".to_string(),
                        chave: Some(atv.chave.clone()),
                        tipo: atv.tipo.clone(),
                        dias_restantes: Some(dias),
                        horas_restantes: None,
                    });
                }
                // data_expiracao missing but has dias_restantes from last sync
                if let Some(dias) = atv.dias_restantes {
                    // Estimate from last validation time
                    let elapsed_days = ((now - atv.data_validacao) as f64 / (1000.0 * 60.0 * 60.0 * 24.0)).floor() as i64;
                    let remaining = (dias - elapsed_days).max(0);
                    return Ok(AtivacaoStatus {
                        ativada: remaining > 0,
                        expirada: remaining <= 0,
                        modo: "offline".to_string(),
                        chave: Some(atv.chave.clone()),
                        tipo: atv.tipo.clone(),
                        dias_restantes: Some(remaining),
                        horas_restantes: None,
                    });
                }
            } else if atv.tipo == "maquina" {
                if let Some(horas) = atv.horas_restantes {
                    let elapsed = (now - atv.data_validacao) as f64 / (1000.0 * 60.0 * 60.0);
                    let remaining = horas - elapsed;
                    return Ok(AtivacaoStatus {
                        ativada: remaining > 0.0,
                        expirada: remaining <= 0.0,
                        modo: "offline".to_string(),
                        chave: Some(atv.chave.clone()),
                        tipo: atv.tipo.clone(),
                        dias_restantes: None,
                        horas_restantes: Some(remaining.max(0.0)),
                    });
                }
            }
            
            // Fallback: activated but no time info
            Ok(AtivacaoStatus {
                ativada: true,
                expirada: false,
                modo: "offline".to_string(),
                chave: Some(atv.chave),
                tipo: atv.tipo,
                dias_restantes: atv.dias_restantes,
                horas_restantes: atv.horas_restantes,
            })
        }
    }
}

/// Parse datetime string in various formats (RFC3339, ISO8601 with/without tz, date-only)
fn parse_datetime(s: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    use chrono::{NaiveDate, NaiveDateTime, TimeZone};
    // Try RFC3339 / ISO8601 with timezone
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&chrono::Utc));
    }
    // Try ISO8601 without timezone (assume UTC)
    if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
        return chrono::Utc.from_local_datetime(&dt).single();
    }
    if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return chrono::Utc.from_local_datetime(&dt).single();
    }
    // Try date only (assume end of day UTC)
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        let dt = d.and_hms_opt(23, 59, 59)?;
        return chrono::Utc.from_local_datetime(&dt).single();
    }
    log::warn!("[ATIVACAO] Could not parse datetime: {}", s);
    None
}

async fn try_online_validation(chave: &str) -> Result<AtivacaoStatus, String> {
    log::info!("[ATIVACAO] Trying online validation for key: {}...", &chave[..chave.len().min(8)]);
    let result = supabase::validar_chave_supabase(chave).await?;
    match result {
        None => Err("Key not found".to_string()),
        Some(chave_data) => {
            log::info!("[ATIVACAO] Online result: status={}, tipo={}, data_expiracao={:?}", 
                chave_data.status, chave_data.tipo, chave_data.data_expiracao);
            
            if chave_data.status != "ativa" {
                // Update local to reflect remote status
                db::remover_ativacao_db().ok();
                return Ok(AtivacaoStatus {
                    ativada: false,
                    expirada: true,
                    modo: "online".to_string(),
                    chave: Some(chave_data.chave.clone()),
                    tipo: chave_data.tipo.clone(),
                    dias_restantes: None,
                    horas_restantes: None,
                });
            }
            
            let now = chrono::Utc::now();
            let mut dias_restantes = None;
            let mut horas_restantes = None;
            let mut data_expiracao_ms: Option<i64> = None;
            
            if chave_data.tipo == "assinatura" {
                if let Some(ref exp_str) = chave_data.data_expiracao {
                    if let Some(exp) = parse_datetime(exp_str) {
                        let diff = exp.signed_duration_since(now);
                        dias_restantes = Some(diff.num_days().max(0));
                        data_expiracao_ms = Some(exp.timestamp_millis());
                        log::info!("[ATIVACAO] Expiration: {}, days remaining: {}", exp, dias_restantes.unwrap_or(0));
                        if diff.num_seconds() < 0 {
                            db::salvar_ativacao(&chave_data.chave, &chave_data.tipo, Some(0), None, data_expiracao_ms)?;
                            return Ok(AtivacaoStatus {
                                ativada: false,
                                expirada: true,
                                modo: "online".to_string(),
                                chave: Some(chave_data.chave.clone()),
                                tipo: chave_data.tipo.clone(),
                                dias_restantes: Some(0),
                                horas_restantes: None,
                            });
                        }
                    }
                }
            } else if chave_data.tipo == "maquina" {
                if let (Some(limite), Some(ref inicio_str)) = (chave_data.limite_tempo, &chave_data.data_inicio) {
                    if let Some(inicio) = parse_datetime(inicio_str) {
                        let elapsed = now.signed_duration_since(inicio).num_seconds() as f64 / 3600.0;
                        let remaining = limite - elapsed;
                        horas_restantes = Some(remaining.max(0.0));
                        log::info!("[ATIVACAO] Machine mode: {:.1}h elapsed, {:.1}h remaining", elapsed, remaining);
                        if remaining <= 0.0 {
                            db::salvar_ativacao(&chave_data.chave, &chave_data.tipo, None, Some(0.0), None)?;
                            return Ok(AtivacaoStatus {
                                ativada: false,
                                expirada: true,
                                modo: "online".to_string(),
                                chave: Some(chave_data.chave.clone()),
                                tipo: chave_data.tipo.clone(),
                                dias_restantes: None,
                                horas_restantes: Some(0.0),
                            });
                        }
                    }
                }
            }
            
            // Save/update locally (Supabase is source of truth)
            db::salvar_ativacao(
                &chave_data.chave,
                &chave_data.tipo,
                dias_restantes,
                horas_restantes,
                data_expiracao_ms,
            )?;
            log::info!("[ATIVACAO] Local DB updated from Supabase");
            
            // Update last use timestamp on Supabase
            supabase::update_ultimo_uso(&chave_data.id).await.ok();
            
            Ok(AtivacaoStatus {
                ativada: true,
                expirada: false,
                modo: "online".to_string(),
                chave: Some(chave_data.chave),
                tipo: chave_data.tipo,
                dias_restantes,
                horas_restantes,
            })
        }
    }
}

#[derive(Serialize)]
pub struct ValidacaoResult {
    pub valida: bool,
    pub error: Option<String>,
    pub chave: Option<ChaveInfo>,
}

#[derive(Serialize)]
pub struct ChaveInfo {
    pub tipo: String,
    #[serde(rename = "diasRestantes")]
    pub dias_restantes: Option<i64>,
    #[serde(rename = "horasRestantes")]
    pub horas_restantes: Option<f64>,
}

#[tauri::command]
pub async fn validar_chave(chave: String) -> Result<ValidacaoResult, String> {
    // Normalize key
    let normalizada = chave.trim().to_uppercase().replace(" ", "-");
    
    let result = supabase::validar_chave_supabase(&normalizada).await;
    
    match result {
        Err(e) => Ok(ValidacaoResult {
            valida: false,
            error: Some(format!("Erro de conexao: {}", e)),
            chave: None,
        }),
        Ok(None) => Ok(ValidacaoResult {
            valida: false,
            error: Some("Chave nao encontrada".to_string()),
            chave: None,
        }),
        Ok(Some(chave_data)) => {
            if chave_data.status != "ativa" {
                return Ok(ValidacaoResult {
                    valida: false,
                    error: Some("Chave expirada ou inativa".to_string()),
                    chave: None,
                });
            }
            
            let now = chrono::Utc::now();
            let mut dias_restantes = None;
            let mut horas_restantes = None;
            let mut data_expiracao_ms: Option<i64> = None;
            
            if chave_data.tipo == "assinatura" {
                if let Some(ref exp_str) = chave_data.data_expiracao {
                    if let Some(exp) = parse_datetime(exp_str) {
                        let diff = exp.signed_duration_since(now);
                        dias_restantes = Some(diff.num_days().max(0));
                        data_expiracao_ms = Some(exp.timestamp_millis());
                    }
                }
            } else if chave_data.tipo == "maquina" {
                if let (Some(limite), Some(ref inicio_str)) = (chave_data.limite_tempo, &chave_data.data_inicio) {
                    if let Some(inicio) = parse_datetime(inicio_str) {
                        let elapsed = now.signed_duration_since(inicio).num_seconds() as f64 / 3600.0;
                        horas_restantes = Some((limite - elapsed).max(0.0));
                    }
                }
            }
            
            // Save locally (Supabase is source of truth)
            db::salvar_ativacao(
                &chave_data.chave,
                &chave_data.tipo,
                dias_restantes,
                horas_restantes,
                data_expiracao_ms,
            )?;
            
            supabase::update_ultimo_uso(&chave_data.id).await.ok();
            
            Ok(ValidacaoResult {
                valida: true,
                error: None,
                chave: Some(ChaveInfo {
                    tipo: chave_data.tipo,
                    dias_restantes,
                    horas_restantes,
                }),
            })
        }
    }
}

#[tauri::command]
pub fn remover_ativacao() -> Result<(), String> {
    db::remover_ativacao_db()
}
