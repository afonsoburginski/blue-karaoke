# Configuração do Supabase

Este projeto está configurado para usar o Supabase como banco de dados PostgreSQL gerenciado.

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto `web/` com as seguintes variáveis:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tutatgjpyzhfviabepln.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_N6erfoQx0hFL-kGLX_DrJA_Ww5R_ml6

# Connect to Supabase via Shared Connection Pooler (para queries normais)
DATABASE_URL="postgresql://postgres.tutatgjpyzhfviabepln:GHynNamVH8U3@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database (para migrations)
DIRECT_URL="postgresql://postgres.tutatgjpyzhfviabepln:GHynNamVH8U3@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# App Configuration
NODE_ENV=production
JWT_SECRET=c+qA7h1elWjnYBXqZRUc56JrEhDICpzaDAHbf7SAf5c=
PORT=3000
HOST=localhost
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
CORS_ORIGIN=https://seu-dominio.vercel.app
SESSION_SECRET=c+qA7h1elWjnYBXqZRUc56JrEhDICpzaDAHbf7SAf5c=
API_BASE_URL=https://seu-dominio.vercel.app/api

# Cloudflare R2 (S3 compatible)
R2_ACCOUNT_ID=94053bea3547ce457a5a161ee592c928
R2_ACCESS_KEY_ID=ca843a1271617c80a4ebd34c70feb593
R2_SECRET_ACCESS_KEY=14e716956b814d2062735de16badc83b225d43cdb3209c3add0a63f318a2723d
R2_BUCKET=blue-karaoke
R2_PUBLIC_URL=https://pub-a95c1f4db1804f92975febb8a0b1feaf.r2.dev
R2_ENDPOINT=https://94053bea3547ce457a5a161ee592c928.r2.cloudflarestorage.com
```

## Diferença entre DATABASE_URL e DIRECT_URL

- **DATABASE_URL**: Usa o pooler do Supabase (porta 6543) - ideal para queries normais da aplicação
- **DIRECT_URL**: Conexão direta (porta 5432) - necessária para migrations e operações DDL

## Comandos Disponíveis

```bash
# Testar conexão com o banco
bun run db:setup

# Aplicar migrations
bun run db:migrate

# Gerar novas migrations
bun run db:generate

# Visualizar banco no Drizzle Studio
bun run db:studio
```

## Configuração no Vercel

Adicione todas as variáveis de ambiente acima nas configurações do projeto no Vercel:

1. Vá em Settings > Environment Variables
2. Adicione cada variável listada acima
3. Certifique-se de que `DIRECT_URL` está configurada para migrations

## Notas Importantes

- O Supabase já gerencia o banco de dados, não é necessário criar manualmente
- Use `DIRECT_URL` apenas para migrations, não para queries normais
- O pooler do Supabase suporta até 200 conexões simultâneas

