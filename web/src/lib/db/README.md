# Estrutura do Banco de Dados

## Arquivos

- **`schema.ts`** - Define todas as tabelas e tipos TypeScript do banco de dados
- **`index.ts`** - Exporta a instância do Drizzle (`db`) e o schema para uso na aplicação
- **`migrate.ts`** - Script para aplicar migrations no banco de dados

## Estrutura de Pastas

```
web/
├── drizzle/                    # Pasta de migrations geradas
│   ├── 0000_*.sql             # Arquivos SQL de migration
│   └── meta/                   # Metadados do Drizzle
│       ├── _journal.json      # Journal de migrations
│       └── *.snapshot.json    # Snapshots do schema
├── src/lib/db/
│   ├── schema.ts               # Schema do banco (tabelas)
│   ├── index.ts                # Conexão e exportações
│   └── migrate.ts              # Script de migration
└── drizzle.config.ts           # Configuração do Drizzle Kit
```

## Tabelas

### `users`
- Usuários do sistema (admin e usuários comuns)
- Campos: id, slug, name, email, password, avatar, role, timestamps

### `musicas`
- Catálogo de músicas de karaokê
- Campos: id, codigo, artista, titulo, arquivo, nomeArquivo, tamanho, duracao, userId, timestamps

### `historico`
- Histórico de reproduções e pontuações
- Campos: id, userId, musicaId, codigo, nota, dataExecucao

### `estatisticas`
- Cache de estatísticas agregadas
- Campos: id, userId, totalUsuarios, totalMusicas, totalGb, receitaMensal, mesReferencia, updatedAt

## Comandos

- `bun run db:generate` - Gera migrations baseadas no schema
- `bun run db:migrate` - Aplica migrations no banco
- `bun run db:push` - Aplica mudanças diretamente (dev)
- `bun run db:studio` - Abre interface visual do banco

