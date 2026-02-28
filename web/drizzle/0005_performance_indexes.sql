-- Migration: Índices de performance para as queries mais frequentes
-- Executar no Supabase SQL Editor ou via drizzle-kit

-- ─── historico ──────────────────────────────────────────────────────────────
-- Query principal: ORDER BY data_execucao DESC LIMIT N (admin = sem user_id filter)
CREATE INDEX IF NOT EXISTS idx_historico_data_execucao
  ON historico (data_execucao DESC);

-- Query por usuário + data (non-admin path + date filter)
CREATE INDEX IF NOT EXISTS idx_historico_user_data
  ON historico (user_id, data_execucao DESC);

-- JOIN com musicas na query de mais tocadas
CREATE INDEX IF NOT EXISTS idx_historico_musica_id
  ON historico (musica_id);

-- GROUP BY + COUNT para mais tocadas (covering index evita heap fetch)
CREATE INDEX IF NOT EXISTS idx_historico_user_musica
  ON historico (user_id, musica_id);

-- ─── musicas ─────────────────────────────────────────────────────────────────
-- Listagem global ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_musicas_created_at
  ON musicas (created_at DESC);

-- Listagem filtrada por usuário (admin visualizando musicas de outro user)
CREATE INDEX IF NOT EXISTS idx_musicas_user_created
  ON musicas (user_id, created_at DESC);

-- ─── chaves_ativacao ─────────────────────────────────────────────────────────
-- Busca de chave por usuário (inArray / eq)
CREATE INDEX IF NOT EXISTS idx_chaves_user_id
  ON chaves_ativacao (user_id);

-- Filtros de status e tipo na tela de admin
CREATE INDEX IF NOT EXISTS idx_chaves_status
  ON chaves_ativacao (status);

CREATE INDEX IF NOT EXISTS idx_chaves_tipo
  ON chaves_ativacao (tipo);

-- Listagem admin com status+tipo combinados
CREATE INDEX IF NOT EXISTS idx_chaves_tipo_status
  ON chaves_ativacao (tipo, status, created_at DESC);

-- ─── assinaturas ─────────────────────────────────────────────────────────────
-- Já existe UNIQUE em user_id (índice implícito), mas criamos explícito para o status filter
CREATE INDEX IF NOT EXISTS idx_assinaturas_user_status
  ON assinaturas (user_id, status);

-- ─── session (better-auth) ───────────────────────────────────────────────────
-- Lookup de sessão por user_id (para listar sessões do usuário)
CREATE INDEX IF NOT EXISTS idx_session_user_id
  ON session (user_id);

-- ─── estatisticas ────────────────────────────────────────────────────────────
-- Cache lookup por user + mes
CREATE INDEX IF NOT EXISTS idx_estatisticas_user_mes
  ON estatisticas (user_id, mes_referencia);

-- ─── users ───────────────────────────────────────────────────────────────────
-- Filtro por isActive e userType (usado na tela de listagem de usuários)
CREATE INDEX IF NOT EXISTS idx_users_active_type
  ON users (is_active, user_type);

-- Filtro por role (admin check removido do código, mas pode ser útil para relatórios)
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);
