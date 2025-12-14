# 🚀 Como Iniciar o PostgreSQL

O banco de dados precisa do PostgreSQL rodando. Escolha uma das opções abaixo:

## Opção 1: Docker (Recomendado - Mais Fácil)

### 1. Iniciar Docker Desktop
- Abra o Docker Desktop no Windows
- Aguarde até aparecer "Docker Desktop is running"

### 2. Executar o script:
```bash
powershell -ExecutionPolicy Bypass -File scripts/start-docker-postgres.ps1
```

Ou manualmente:
```bash
docker run --name postgres-blue-karaoke -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blue_karaoke -p 5432:5432 -d postgres:latest
```

## Opção 2: PostgreSQL Instalado

### 1. Verificar se está instalado:
```powershell
Get-Service -Name "*postgres*"
```

### 2. Iniciar o serviço:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-postgres.ps1
```

Ou manualmente:
- Abra "Gerenciador de Serviços" (services.msc)
- Procure por "postgresql-x64-XX"
- Clique com botão direito > Iniciar

## Opção 3: Instalar PostgreSQL

1. Baixe em: https://www.postgresql.org/download/windows/
2. Instale com as configurações padrão
3. Anote a senha do usuário `postgres`
4. Se a senha for diferente de "postgres", edite o arquivo `.env.local`
5. Execute: `bun run db:setup`

## ✅ Depois de Iniciar o PostgreSQL

Execute os seguintes comandos:

```bash
# 1. Configurar o banco (cria se não existir)
bun run db:setup

# 2. Aplicar migrations (cria as tabelas)
bun run db:migrate

# 3. Testar conexão
bun run db:test
```

## 🔍 Verificar se está Funcionando

```bash
bun run db:test
```

Se aparecer "✅ Conexão estabelecida com sucesso!", está tudo certo!

