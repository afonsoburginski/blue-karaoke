import { sqlite } from "./local-db"

/**
 * Inicializa o banco de dados local criando as tabelas se não existirem
 */
export async function initLocalDb() {
  try {
    const { sqlite } = await import("./local-db")
    
    // Criar tabela de músicas
    sqlite.exec(`
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
      )
    `)

    // Criar tabela de histórico
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS historico_local (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        musica_id TEXT,
        codigo TEXT NOT NULL,
        data_execucao INTEGER NOT NULL,
        synced_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `)

    // Criar tabela de ativação
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ativacao_local (
        id TEXT PRIMARY KEY DEFAULT '1',
        chave TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL,
        dias_restantes INTEGER,
        horas_restantes INTEGER,
        data_expiracao INTEGER,
        data_validacao INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Criar índices para melhor performance
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_historico_codigo ON historico_local(codigo)
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_historico_synced ON historico_local(synced_at)
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_musicas_codigo ON musicas_local(codigo)
    `)

    console.log("Banco de dados local inicializado com sucesso")
  } catch (error: any) {
    // Se já existe, não é erro crítico
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      console.log("Banco de dados local já existe")
      return
    }
    console.error("Erro ao inicializar banco de dados local:", error)
    throw error
  }
}

