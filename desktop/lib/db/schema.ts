import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core"

// Tabela de Músicas (compatível com web)
// Nota: userId é opcional no banco para permitir uso do desktop sem autenticação
export const musicas = pgTable("musicas", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  artista: text("artista").notNull(),
  titulo: text("titulo").notNull(),
  arquivo: text("arquivo").notNull(), // caminho do arquivo local ou URL
  nomeArquivo: text("nome_arquivo"), // nome original do arquivo
  tamanho: integer("tamanho"), // tamanho em bytes
  duracao: integer("duracao"), // duração em segundos
  userId: uuid("user_id"), // Opcional: para rastrear usuário que adicionou
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Histórico (compatível com web)
// Nota: userId e musicaId são opcionais no banco para permitir uso do desktop sem autenticação
export const historico = pgTable("historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"), // Opcional: para rastrear usuário (text para compatibilidade com CUID)
  musicaId: uuid("musica_id"), // Opcional: referência à música
  codigo: text("codigo").notNull(), // código da música para referência rápida
  dataExecucao: timestamp("data_execucao").notNull().defaultNow(),
})

export type Musica = typeof musicas.$inferSelect
export type NewMusica = typeof musicas.$inferInsert
export type Historico = typeof historico.$inferSelect
export type NewHistorico = typeof historico.$inferInsert

