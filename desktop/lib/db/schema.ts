import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const musicas = sqliteTable("musicas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  artista: text("artista").notNull(),
  titulo: text("titulo").notNull(),
  arquivo: text("arquivo").notNull(), // caminho do arquivo local ou URL
  nomeArquivo: text("nome_arquivo"), // nome original do arquivo no Google Drive
  criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

export const historico = sqliteTable("historico", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull(),
  nota: integer("nota").notNull(),
  dataExecucao: integer("data_execucao", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

export type Musica = typeof musicas.$inferSelect
export type NewMusica = typeof musicas.$inferInsert
export type Historico = typeof historico.$inferSelect
export type NewHistorico = typeof historico.$inferInsert

