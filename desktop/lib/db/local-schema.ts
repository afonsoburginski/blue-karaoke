import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// Tabela de Músicas Local (SQLite)
export const musicasLocal = sqliteTable("musicas_local", {
  id: text("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  artista: text("artista").notNull(),
  titulo: text("titulo").notNull(),
  arquivo: text("arquivo").notNull(),
  nomeArquivo: text("nome_arquivo"),
  tamanho: integer("tamanho"),
  duracao: integer("duracao"),
  userId: text("user_id"),
  syncedAt: integer("synced_at"), // timestamp da última sincronização
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// Tabela de Histórico Local (SQLite)
export const historicoLocal = sqliteTable("historico_local", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  musicaId: text("musica_id"),
  codigo: text("codigo").notNull(),
  dataExecucao: integer("data_execucao").notNull(),
  syncedAt: integer("synced_at"), // null = não sincronizado
  createdAt: integer("created_at").notNull(),
})

// Tabela de Ativação Local (SQLite) - Armazena chave e dias restantes para funcionamento offline
export const ativacaoLocal = sqliteTable("ativacao_local", {
  id: text("id").primaryKey().default("1"), // Sempre 1, apenas uma ativação por instalação
  chave: text("chave").notNull().unique(),
  tipo: text("tipo").notNull(), // 'assinatura' ou 'maquina'
  diasRestantes: integer("dias_restantes"), // Para tipo 'assinatura'
  horasRestantes: integer("horas_restantes"), // Para tipo 'maquina'
  dataExpiracao: integer("data_expiracao"), // Timestamp da data de expiração
  dataValidacao: integer("data_validacao").notNull(), // Timestamp da última validação online
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export type MusicaLocal = typeof musicasLocal.$inferSelect
export type NewMusicaLocal = typeof musicasLocal.$inferInsert
export type HistoricoLocal = typeof historicoLocal.$inferSelect
export type NewHistoricoLocal = typeof historicoLocal.$inferInsert
export type AtivacaoLocal = typeof ativacaoLocal.$inferSelect
export type NewAtivacaoLocal = typeof ativacaoLocal.$inferInsert

