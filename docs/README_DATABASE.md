# Configuração do Banco de Dados

Este projeto usa PostgreSQL com Drizzle ORM.

## Pré-requisitos

1. **PostgreSQL instalado localmente**
   - Baixe em: https://www.postgresql.org/download/
   - Ou use Docker: `docker run --name postgres-blue-karaoke -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blue_karaoke -p 5432:5432 -d postgres`

## Configuração

1. **Criar arquivo `.env.local`** na raiz do projeto `web/`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blue_karaoke?sslmode=disable
   NODE_ENV=development
   ```

2. **Configurar o banco de dados**:
   ```bash
   bun run db:setup
   ```
   Este comando cria o banco automaticamente se não existir.

3. **Gerar migrations**:
   ```bash
   bun run db:generate
   ```

4. **Aplicar migrations**:
   ```bash
   bun run db:push
   ```

   Ou use migrations:
   ```bash
   bun run db:migrate
   ```

5. **Abrir Drizzle Studio** (opcional, para visualizar o banco):
   ```bash
   bun run db:studio
   ```

## Scripts Disponíveis

- `bun run db:setup` - Configura o banco de dados (cria se não existir)
- `bun run db:test` - Testa a conexão com PostgreSQL
- `bun run db:generate` - Gera arquivos de migration baseados no schema
- `bun run db:migrate` - Aplica migrations no banco
- `bun run db:push` - Aplica mudanças diretamente no banco (desenvolvimento)
- `bun run db:studio` - Abre interface visual do banco de dados

## Estrutura do Banco

### Tabelas

- **users**: Usuários do sistema (admin e usuários comuns)
- **musicas**: Catálogo de músicas de karaokê
- **historico**: Histórico de reproduções e pontuações
- **estatisticas**: Cache de estatísticas agregadas

## Notas

- O arquivo `.env.local` não deve ser commitado (já está no .gitignore)
- Use `.env.example` como referência para outras pessoas do time
- Em produção, configure a `DATABASE_URL` nas variáveis de ambiente do servidor

