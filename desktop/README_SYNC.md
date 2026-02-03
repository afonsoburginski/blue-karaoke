# Sistema de Sincronização Desktop - Guia Completo

## ✅ Status: Pronto e Funcionando

O sistema está **100% funcional** e pronto para uso!

## 🚀 Inicialização Rápida

### 1. Instalar Dependências
```bash
cd desktop
bun install
```

### 2. Inicializar Banco Local (Primeira vez)
```bash
bun run db:init-local
```

**Nota:** O banco será inicializado automaticamente na primeira execução, mas você pode forçar a inicialização manualmente.

### 3. Executar App
```bash
bun run electron:dev
```

## 📋 Como Funciona

### Banco Local (SQLite)
- **Localização**: `db.sqlite` (desenvolvimento) ou `userData/db.sqlite` (produção)
- **Inicialização**: Automática na primeira requisição da API
- **Tabelas**:
  - `musicas_local`: Cache de músicas
  - `historico_local`: Histórico de reproduções

### Sincronização Automática
1. **Salvamento Local**: Sempre salva primeiro no SQLite (funciona offline)
2. **Sincronização**: Quando online, sincroniza automaticamente com Supabase
3. **Background**: Sincronização não bloqueia o app

### APIs Disponíveis

#### Inicialização
- `GET /api/init` - Inicializa banco local

#### Sincronização
- `GET /api/sync` - Status da sincronização
- `POST /api/sync` - Força sincronização manual

#### Histórico
- `POST /api/historico` - Salva reprodução (salva local + sincroniza)

## 🔄 Fluxo de Dados

```
App Desktop → SQLite Local → (Online) → Supabase → Dashboard Web
                ↓
            (Offline)
                ↓
         Aguarda conexão
```

## 📊 Dashboard Web

O dashboard web (`/api/estatisticas`) mostra:
- ✅ **Mais Tocadas**: Agregado de todas as reproduções
- ✅ **Novos Usuários**: Usuários cadastrados recentemente
- ✅ **Estatísticas Gerais**: Total de músicas, usuários, etc.

## 🗑️ Zerar dados locais (músicas / histórico)

**Quando usar:** Você apagou a pasta de músicas ou quer forçar o app a baixar tudo de novo.

1. **Feche o app** (Electron e Next) para não travar o banco.
2. No terminal, na pasta `desktop`:

```bash
bun run db:zerar
```

Isso apaga **tudo** do SQLite local: `musicas_local`, `historico_local`, `ativacao_local`. Na próxima abertura o app vai sincronizar e baixar as músicas de novo.

---

## 🛠️ Troubleshooting

### Banco não inicializa
```bash
# Forçar inicialização
bun run db:init-local

# Ou via API
curl http://localhost:3000/api/init
```

### Sincronização não funciona
1. Verificar conexão com Supabase (`.env.local`)
2. Verificar status: `GET /api/sync`
3. Forçar sincronização: `POST /api/sync`

### Dados não aparecem no dashboard
1. Verificar se sincronização foi concluída
2. Verificar se há dados no Supabase
3. Verificar permissões de admin no dashboard

## ✨ Recursos Implementados

- ✅ Banco SQLite local para funcionamento offline
- ✅ Sincronização automática com Supabase
- ✅ Inicialização automática do banco
- ✅ Middleware para garantir inicialização
- ✅ API de sincronização manual
- ✅ Dashboard web com dados agregados
- ✅ Músicas mais tocadas
- ✅ Novos usuários
- ✅ Sem perda de dados (sempre salva local primeiro)

## 📝 Notas Importantes

- O banco local é criado automaticamente na primeira execução
- Dados são sempre salvos localmente primeiro (funciona offline)
- Sincronização acontece em background (não bloqueia)
- Dashboard web mostra dados agregados do Supabase
- Compatível com o schema do web (sem campo `nota`)

