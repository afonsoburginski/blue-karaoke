use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::Path;

static DB: once_cell::sync::Lazy<Mutex<Option<Connection>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(None));

pub fn init_db(data_dir: &str) -> Result<(), String> {
    let db_path = Path::new(data_dir).join("db.sqlite");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS musicas_local (
            id TEXT PRIMARY KEY,
            codigo TEXT NOT NULL UNIQUE,
            artista TEXT NOT NULL,
            titulo TEXT NOT NULL,
            arquivo TEXT NOT NULL,
            nome_arquivo TEXT,
            tamanho INTEGER,
            duracao INTEGER,
            user_id TEXT,
            synced_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS historico_local (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            musica_id TEXT,
            codigo TEXT NOT NULL,
            data_execucao INTEGER NOT NULL,
            synced_at INTEGER,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ativacao_local (
            id TEXT PRIMARY KEY DEFAULT '1',
            chave TEXT NOT NULL UNIQUE,
            tipo TEXT NOT NULL,
            dias_restantes INTEGER,
            horas_restantes REAL,
            data_expiracao INTEGER,
            data_validacao INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_musicas_codigo ON musicas_local(codigo);
        CREATE INDEX IF NOT EXISTS idx_historico_codigo ON historico_local(codigo);
        CREATE INDEX IF NOT EXISTS idx_historico_synced ON historico_local(synced_at);
    ").map_err(|e| e.to_string())?;

    log::info!("Database initialized at {:?}", db_path);

    let mut guard = DB.lock().unwrap();
    *guard = Some(conn);
    Ok(())
}

pub fn with_db<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&Connection) -> Result<R, rusqlite::Error>,
{
    let guard = DB.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    f(conn).map_err(|e| e.to_string())
}

// -- Models --

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Musica {
    pub id: String,
    pub codigo: String,
    pub artista: String,
    pub titulo: String,
    pub arquivo: String,
    #[serde(rename = "nomeArquivo")]
    pub nome_arquivo: Option<String>,
    pub tamanho: Option<i64>,
    pub duracao: Option<i64>,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicaSimple {
    pub codigo: String,
    pub artista: String,
    pub titulo: String,
    pub arquivo: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Ativacao {
    pub id: String,
    pub chave: String,
    pub tipo: String,
    pub dias_restantes: Option<i64>,
    pub horas_restantes: Option<f64>,
    pub data_expiracao: Option<i64>,
    pub data_validacao: i64,
}

// -- Queries --

pub fn buscar_musicas_db(query: &str) -> Result<Vec<MusicaSimple>, String> {
    with_db(|conn| {
        let termo = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT codigo, artista, titulo, arquivo FROM musicas_local
             WHERE artista LIKE ?1 OR titulo LIKE ?1 OR codigo LIKE ?1
             LIMIT 50"
        )?;
        let rows = stmt.query_map(params![termo], |row| {
            Ok(MusicaSimple {
                codigo: row.get(0)?,
                artista: row.get(1)?,
                titulo: row.get(2)?,
                arquivo: row.get(3)?,
            })
        })?;
        let mut result = Vec::new();
        for r in rows {
            result.push(r?);
        }
        Ok(result)
    })
}

pub fn get_musica_by_codigo_db(codigo: &str) -> Result<Option<MusicaSimple>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT codigo, artista, titulo, arquivo FROM musicas_local WHERE codigo = ?1"
        )?;
        let mut rows = stmt.query_map(params![codigo], |row| {
            Ok(MusicaSimple {
                codigo: row.get(0)?,
                artista: row.get(1)?,
                titulo: row.get(2)?,
                arquivo: row.get(3)?,
            })
        })?;
        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    })
}

pub fn musica_aleatoria_db() -> Result<Option<String>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT codigo FROM musicas_local ORDER BY RANDOM() LIMIT 1"
        )?;
        let mut rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    })
}

pub fn count_musicas_local() -> Result<i64, String> {
    with_db(|conn| {
        conn.query_row("SELECT COUNT(*) FROM musicas_local", [], |row| row.get(0))
    })
}

pub fn insert_musica(musica: &Musica) -> Result<(), String> {
    with_db(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO musicas_local 
             (id, codigo, artista, titulo, arquivo, nome_arquivo, tamanho, duracao, user_id, synced_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                musica.id,
                musica.codigo,
                musica.artista,
                musica.titulo,
                musica.arquivo,
                musica.nome_arquivo,
                musica.tamanho,
                musica.duracao,
                musica.user_id,
                chrono::Utc::now().timestamp_millis(),
                musica.tamanho.unwrap_or(chrono::Utc::now().timestamp_millis()),
                chrono::Utc::now().timestamp_millis(),
            ],
        )?;
        Ok(())
    })
}

pub fn musica_existe(codigo: &str) -> Result<bool, String> {
    with_db(|conn| {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM musicas_local WHERE codigo = ?1",
            params![codigo],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    })
}

pub fn salvar_historico_db(codigo: &str) -> Result<(), String> {
    with_db(|conn| {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO historico_local (id, codigo, data_execucao, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, codigo, now, now],
        )?;
        Ok(())
    })
}

pub fn get_ativacao() -> Result<Option<Ativacao>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, chave, tipo, dias_restantes, horas_restantes, data_expiracao, data_validacao
             FROM ativacao_local WHERE id = '1'"
        )?;
        let mut rows = stmt.query_map([], |row| {
            Ok(Ativacao {
                id: row.get(0)?,
                chave: row.get(1)?,
                tipo: row.get(2)?,
                dias_restantes: row.get(3)?,
                horas_restantes: row.get(4)?,
                data_expiracao: row.get(5)?,
                data_validacao: row.get(6)?,
            })
        })?;
        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    })
}

pub fn salvar_ativacao(chave: &str, tipo: &str, dias_restantes: Option<i64>, horas_restantes: Option<f64>, data_expiracao: Option<i64>) -> Result<(), String> {
    with_db(|conn| {
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT OR REPLACE INTO ativacao_local 
             (id, chave, tipo, dias_restantes, horas_restantes, data_expiracao, data_validacao, created_at, updated_at)
             VALUES ('1', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![chave, tipo, dias_restantes, horas_restantes, data_expiracao, now, now, now],
        )?;
        Ok(())
    })
}

pub fn remover_ativacao_db() -> Result<(), String> {
    with_db(|conn| {
        conn.execute("DELETE FROM ativacao_local WHERE id = '1'", [])?;
        Ok(())
    })
}

pub fn storage_used() -> Result<i64, String> {
    with_db(|conn| {
        let total: i64 = conn.query_row(
            "SELECT COALESCE(SUM(tamanho), 0) FROM musicas_local",
            [],
            |row| row.get(0),
        )?;
        Ok(total)
    })
}
