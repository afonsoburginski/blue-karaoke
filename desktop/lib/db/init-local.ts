/**
 * Inicializa o banco de dados local criando as tabelas se não existirem.
 * Usa import dinâmico para não carregar better-sqlite3 no Edge/middleware.
 * Cada tabela é criada independentemente para evitar "no such table" em instalações novas.
 */
export async function initLocalDb() {
  const { sqlite } = await import("./local-db")

  const run = (sql: string, label: string) => {
    try {
      sqlite.exec(sql)
    } catch (error: any) {
      if (!error.message?.includes("already exists") && !error.message?.includes("duplicate")) {
        console.error(`Erro ao criar ${label}:`, error.message)
        throw error
      }
    }
  }

  run(
    `CREATE TABLE IF NOT EXISTS musicas_local (
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
    )`,
    "musicas_local"
  )

  run(
    `CREATE TABLE IF NOT EXISTS historico_local (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      musica_id TEXT,
      codigo TEXT NOT NULL,
      data_execucao INTEGER NOT NULL,
      synced_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    "historico_local"
  )

  run(
    `CREATE TABLE IF NOT EXISTS ativacao_local (
      id TEXT PRIMARY KEY DEFAULT '1',
      chave TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL,
      dias_restantes INTEGER,
      horas_restantes INTEGER,
      data_expiracao INTEGER,
      data_validacao INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    "ativacao_local"
  )

  run(`CREATE INDEX IF NOT EXISTS idx_historico_codigo ON historico_local(codigo)`, "idx_historico_codigo")
  run(`CREATE INDEX IF NOT EXISTS idx_historico_synced ON historico_local(synced_at)`, "idx_historico_synced")
  run(`CREATE INDEX IF NOT EXISTS idx_musicas_codigo ON musicas_local(codigo)`, "idx_musicas_codigo")

  console.log("Banco de dados local inicializado com sucesso")
}

