# Configuração do Supabase para Desktop

O app desktop agora está configurado para usar o Supabase como banco de dados PostgreSQL gerenciado.

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto `desktop/` com as seguintes variáveis:

```env
# Supabase Configuration
# Connect to Supabase via Shared Connection Pooler (para queries normais)
DATABASE_URL="postgresql://postgres.tutatgjpyzhfviabepln:GHynNamVH8U3@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database (para migrations)
DIRECT_URL="postgresql://postgres.tutatgjpyzhfviabepln:GHynNamVH8U3@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# Server Configuration (opcional - para sync local)
SERVER_MUSICAS_DIR="D:\\Nova pasta"
```

## Diferença entre DATABASE_URL e DIRECT_URL

- **DATABASE_URL**: Usa o pooler do Supabase (porta 6543) - ideal para queries normais da aplicação
- **DIRECT_URL**: Conexão direta (porta 5432) - necessária para migrations e operações DDL

## Comandos Disponíveis

```bash
# Aplicar migrations
bun run db:migrate

# Gerar novas migrations
bun run db:generate

# Visualizar banco no Drizzle Studio
bun run db:studio
```

## Mudanças Realizadas

1. **Schema**: Convertido de SQLite para PostgreSQL
2. **Conexão**: Agora usa `postgres-js` ao invés de `better-sqlite3`
3. **Migrations**: Configuradas para usar Supabase
4. **Compatibilidade**: Schema compatível com o web, mas campos opcionais para flexibilidade

## Notas Importantes

- O desktop agora compartilha o mesmo banco de dados do web
- As músicas e histórico são sincronizados entre desktop e web
- O desktop pode funcionar sem userId (para uso offline/local)
- Use `DIRECT_URL` apenas para migrations, não para queries normais

