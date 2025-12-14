# 🚀 Guia de Setup Completo

## 1. Instalar PostgreSQL

### Windows
1. Baixe o PostgreSQL: https://www.postgresql.org/download/windows/
2. Instale com as configurações padrão
3. Anote a senha do usuário `postgres` que você definiu durante a instalação

### Docker (Alternativa)
```bash
docker run --name postgres-blue-karaoke \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blue_karaoke \
  -p 5432:5432 \
  -d postgres:latest
```

## 2. Configurar Variáveis de Ambiente

O arquivo `.env.local` já foi criado com:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blue_karaoke?sslmode=disable
NODE_ENV=development
```

**⚠️ IMPORTANTE:** Se você usou uma senha diferente durante a instalação do PostgreSQL, edite o arquivo `.env.local` e altere a senha na `DATABASE_URL`.

## 3. Iniciar o PostgreSQL

### Windows (Serviço)
- O PostgreSQL geralmente inicia automaticamente como serviço
- Verifique no "Gerenciador de Serviços" se o serviço "postgresql-x64-XX" está rodando

### Docker
```bash
docker start postgres-blue-karaoke
```

## 4. Configurar o Banco de Dados

Execute o script de setup:
```bash
bun run db:setup
```

Este script irá:
- ✅ Verificar conexão com PostgreSQL
- ✅ Criar o banco `blue_karaoke` se não existir
- ✅ Testar a conexão

## 5. Aplicar Migrations

Depois que o banco estiver configurado, aplique as migrations:
```bash
bun run db:migrate
```

Isso criará todas as tabelas:
- `users` - Usuários do sistema
- `musicas` - Catálogo de músicas
- `historico` - Histórico de reproduções
- `estatisticas` - Estatísticas agregadas

## 6. Verificar Tudo

Teste a conexão:
```bash
bun run db:test
```

Abra o Drizzle Studio para visualizar o banco:
```bash
bun run db:studio
```

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `bun run db:setup` | Configura o banco de dados (cria se não existir) |
| `bun run db:test` | Testa a conexão com PostgreSQL |
| `bun run db:generate` | Gera migrations baseadas no schema |
| `bun run db:migrate` | Aplica migrations no banco |
| `bun run db:push` | Aplica mudanças diretamente (dev) |
| `bun run db:studio` | Abre interface visual do banco |

## 🔧 Troubleshooting

### Erro: "PostgreSQL não está rodando"
- Verifique se o serviço PostgreSQL está iniciado
- No Windows: Abra "Gerenciador de Serviços" e inicie o serviço "postgresql-x64-XX"
- Ou use Docker: `docker start postgres-blue-karaoke`

### Erro: "Credenciais inválidas"
- Edite o arquivo `.env.local` e atualize a senha na `DATABASE_URL`
- Formato: `postgresql://usuario:senha@localhost:5432/blue_karaoke`

### Erro: "Banco de dados não existe"
- Execute: `bun run db:setup` para criar automaticamente
- Ou crie manualmente: `CREATE DATABASE blue_karaoke;`

## ✅ Checklist de Setup

- [ ] PostgreSQL instalado e rodando
- [ ] Arquivo `.env.local` configurado com credenciais corretas
- [ ] Banco de dados criado (`bun run db:setup`)
- [ ] Migrations aplicadas (`bun run db:migrate`)
- [ ] Conexão testada (`bun run db:test`)

