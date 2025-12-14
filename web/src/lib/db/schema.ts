import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core"

// Tabela de Usuários (compatível com Better Auth)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"), // Better Auth usa "image" ao invés de "avatar"
  avatar: text("avatar"), // Mantemos para compatibilidade
  password: text("password").notNull(), // Hash da senha
  role: text("role").notNull().default("user"), // 'user', 'admin', 'machine'
  userType: text("user_type").notNull().default("subscriber"), // 'subscriber', 'machine'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Campos do plugin username
  username: text("username").unique(),
  displayUsername: text("display_username"),
})

// Tabela de Sessões (Better Auth)
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Contas (Better Auth - para OAuth)
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Verificação (Better Auth)
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Músicas
export const musicas = pgTable("musicas", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  artista: text("artista").notNull(),
  titulo: text("titulo").notNull(),
  arquivo: text("arquivo").notNull(), // caminho do arquivo ou URL na nuvem
  nomeArquivo: text("nome_arquivo"), // nome original do arquivo
  tamanho: integer("tamanho"), // tamanho em bytes
  duracao: integer("duracao"), // duração em segundos
  userId: uuid("user_id").references(() => users.id).notNull(), // usuário que fez upload
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Histórico de Reproduções
export const historico = pgTable("historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  musicaId: uuid("musica_id").references(() => musicas.id).notNull(),
  codigo: text("codigo").notNull(), // código da música para referência rápida
  nota: integer("nota").notNull(), // pontuação (0-100)
  dataExecucao: timestamp("data_execucao").notNull().defaultNow(),
})

// Tabela de Estatísticas (para cache de dados agregados)
export const estatisticas = pgTable("estatisticas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  totalUsuarios: integer("total_usuarios").default(0),
  totalMusicas: integer("total_musicas").default(0),
  totalGb: integer("total_gb").default(0), // tamanho total em GB
  receitaMensal: integer("receita_mensal").default(0), // em centavos
  mesReferencia: text("mes_referencia").notNull(), // formato: YYYY-MM
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Assinaturas
export const assinaturas = pgTable("assinaturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  plano: text("plano").notNull(), // 'mensal', 'trimestral', 'anual'
  status: text("status").notNull().default("ativa"), // 'ativa', 'cancelada', 'expirada'
  dataInicio: timestamp("data_inicio").notNull().defaultNow(),
  dataFim: timestamp("data_fim").notNull(),
  valor: integer("valor").notNull(), // em centavos
  renovacaoAutomatica: boolean("renovacao_automatica").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Chaves de Ativação
export const chavesAtivacao = pgTable("chaves_ativacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: text("chave").notNull().unique(), // Chave única de ativação
  userId: uuid("user_id").references(() => users.id), // Usuário associado (se for assinante)
  tipo: text("tipo").notNull(), // 'assinatura' ou 'maquina'
  status: text("status").notNull().default("ativa"), // 'ativa', 'expirada', 'revogada'
  limiteTempo: integer("limite_tempo"), // Limite em horas (para máquinas)
  dataInicio: timestamp("data_inicio"), // Quando começou a usar (para máquinas)
  dataExpiracao: timestamp("data_expiracao"), // Data de expiração (para assinaturas)
  criadoPor: uuid("criado_por").references(() => users.id).notNull(), // Admin que criou
  usadoEm: timestamp("usado_em"), // Quando foi usado pela primeira vez
  ultimoUso: timestamp("ultimo_uso"), // Última vez que foi usada
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Tabela de Sincronização (para rastrear sincronizações entre desktop e admin)
export const sincronizacoes = pgTable("sincronizacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(), // Usuário/máquina que sincronizou
  tipo: text("tipo").notNull(), // 'musica', 'historico', 'completa'
  dados: text("dados").notNull(), // JSON com os dados sincronizados
  status: text("status").notNull().default("pendente"), // 'pendente', 'processada', 'erro'
  dataSincronizacao: timestamp("data_sincronizacao").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Tipos TypeScript inferidos
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Musica = typeof musicas.$inferSelect
export type NewMusica = typeof musicas.$inferInsert
export type Historico = typeof historico.$inferSelect
export type NewHistorico = typeof historico.$inferInsert
export type Estatistica = typeof estatisticas.$inferSelect
export type NewEstatistica = typeof estatisticas.$inferInsert
export type Assinatura = typeof assinaturas.$inferSelect
export type NewAssinatura = typeof assinaturas.$inferInsert
export type ChaveAtivacao = typeof chavesAtivacao.$inferSelect
export type NewChaveAtivacao = typeof chavesAtivacao.$inferInsert
export type Sincronizacao = typeof sincronizacoes.$inferSelect
export type NewSincronizacao = typeof sincronizacoes.$inferInsert
export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert
export type Account = typeof account.$inferSelect
export type NewAccount = typeof account.$inferInsert
export type Verification = typeof verification.$inferSelect
export type NewVerification = typeof verification.$inferInsert

