# API de Sync do Google Drive

Esta API permite baixar e sincronizar músicas do Google Drive para o projeto, salvando-as na base de dados SQLite.

## Configuração Inicial

### 1. Configurar Google Drive API

Você precisa configurar as credenciais do Google Drive. Há duas opções:

#### Opção A: OAuth2 (Recomendado para desenvolvimento)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Drive
4. Crie credenciais OAuth 2.0
5. Configure as variáveis de ambiente no arquivo `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id=1020335647502-km1gl7so0d4d4usqagk1jsd2mu5itrtn.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=seu_refresh_token
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

#### Opção B: Service Account (Recomendado para produção)

1. Crie uma Service Account no Google Cloud Console
2. Baixe a chave JSON
3. Configure a variável de ambiente:

```env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Nota:** Para usar Service Account, você precisa compartilhar a pasta do Google Drive com o email da service account.

### 2. Inicializar o Banco de Dados

Execute as migrações para criar as tabelas:

```bash
bun run db:init
```

## Uso da API

### Endpoint: `GET /api/sync`

Lista os arquivos disponíveis no Google Drive sem baixá-los:

```bash
curl http://localhost:3000/api/sync
```

Resposta:
```json
{
  "success": true,
  "total": 10,
  "files": [
    {
      "id": "file_id",
      "name": "01001.mp4",
      "codigo": "01001",
      "size": "12345678"
    }
  ]
}
```

### Endpoint: `POST /api/sync`

Baixa todos os arquivos do Google Drive e salva na base de dados:

```bash
curl -X POST http://localhost:3000/api/sync
```

Resposta:
```json
{
  "success": true,
  "message": "Sync concluído: 10 baixados, 0 ignorados, 0 erros",
  "results": {
    "total": 10,
    "downloaded": 10,
    "skipped": 0,
    "errors": [],
    "musicas": [
      {
        "codigo": "01001",
        "titulo": "Música 01001",
        "artista": "Artista 01001"
      }
    ]
  }
}
```

## Formato dos Arquivos

Os arquivos devem seguir o padrão de nomenclatura:
- **Formato:** `CCCCC.ext` onde `CCCCC` é um código de 5 dígitos
- **Exemplo:** `01001.mp4`, `12345.avi`
- **Extensões suportadas:** `.mp4`, `.avi`, `.mov`, `.mkv` (maiúsculas ou minúsculas)

O código será extraído automaticamente do nome do arquivo e usado como identificador único.

## Estrutura do Banco de Dados

### Tabela `musicas`

- `id`: ID único (auto-incremento)
- `codigo`: Código da música (5 dígitos, único)
- `artista`: Nome do artista
- `titulo`: Título da música
- `arquivo`: Caminho do arquivo (ex: `/api/musicas/01001.mp4`)
- `nomeArquivo`: Nome original do arquivo no Google Drive
- `criadoEm`: Data de criação
- `atualizadoEm`: Data de atualização

### Tabela `historico`

- `id`: ID único (auto-incremento)
- `codigo`: Código da música executada
- `nota`: Nota recebida (0-100)
- `dataExecucao`: Data/hora da execução

## Servir Arquivos de Música

Os arquivos baixados são servidos através da rota:
```
/api/musicas/[nome_do_arquivo]
```

Exemplo: `/api/musicas/01001.mp4`

## Scripts Disponíveis

- `bun run db:generate` - Gera migrações baseadas no schema
- `bun run db:init` - Aplica migrações ao banco
- `bun run db:push` - Sincroniza schema com o banco (sem migrações)
- `bun run db:studio` - Abre o Drizzle Studio para visualizar o banco

## Notas

- Os arquivos são salvos na pasta `musicas/` na raiz do projeto
- Arquivos já existentes não são baixados novamente
- A API extrai automaticamente o código do nome do arquivo
- Por padrão, o título e artista são gerados automaticamente (você pode melhorar isso depois)

