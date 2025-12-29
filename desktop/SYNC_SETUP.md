# Sistema de Sincronização Desktop ↔ Supabase

O app desktop agora funciona com **banco de dados local (SQLite)** para funcionar offline e **sincroniza automaticamente** com o Supabase quando estiver online.

## Arquitetura

### Banco Local (SQLite)
- **Localização**: `db.sqlite` (desenvolvimento) ou `userData/db.sqlite` (produção)
- **Tabelas**:
  - `musicas_local`: Cache local de músicas
  - `historico_local`: Histórico de reproduções (sincroniza com Supabase)

### Banco Remoto (Supabase)
- **Conexão**: PostgreSQL via Supabase
- **Sincronização**: Dados locais são enviados automaticamente quando online

## Como Funciona

### 1. Salvamento Local (Sempre)
- Quando uma música é reproduzida, o histórico é salvo **imediatamente** no SQLite local
- Funciona mesmo **offline**

### 2. Sincronização Automática
- Quando o app detecta conexão com Supabase, sincroniza automaticamente:
  - Histórico de reproduções não sincronizado
  - Músicas novas (se houver)

### 3. Sincronização Manual
Você pode forçar sincronização via API:

```bash
# Verificar status
GET /api/sync

# Sincronizar tudo
POST /api/sync
```

## Inicialização

### Primeira vez
```bash
# Inicializar banco local
bun run db:init-local
```

### Desenvolvimento
O banco local é criado automaticamente na primeira execução.

## Estrutura de Dados

### Histórico Local
- `id`: UUID único
- `codigo`: Código da música
- `dataExecucao`: Timestamp da reprodução
- `syncedAt`: Timestamp da sincronização (null = não sincronizado)
- `userId`: Opcional (para rastrear usuário)
- `musicaId`: Opcional (referência à música)

### Músicas Local
- Cache local das músicas do Supabase
- `syncedAt`: Indica se já está sincronizado

## Fluxo de Sincronização

1. **App Desktop reproduz música** → Salva no SQLite local
2. **App detecta conexão** → Sincroniza histórico não sincronizado
3. **Supabase recebe dados** → Dashboard web mostra estatísticas

## Dashboard Web

O dashboard web (`/api/estatisticas`) mostra:
- **Mais Tocadas**: Agregado de todas as reproduções do Supabase
- **Novos Usuários**: Usuários cadastrados recentemente
- **Estatísticas Gerais**: Total de músicas, reproduções, etc.

## Notas Importantes

- ✅ Funciona **offline**: Todos os dados são salvos localmente primeiro
- ✅ Sincronização **automática**: Quando online, sincroniza em background
- ✅ Sem perda de dados: Mesmo offline, tudo fica salvo localmente
- ✅ Compatível com web: Mesmo schema no Supabase

