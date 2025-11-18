# Teste de Integração com Google Drive

## Status Atual

❌ **A integração não está funcionando porque falta o `GOOGLE_REFRESH_TOKEN`**

O arquivo `.env` está configurado com:
- ✅ `GOOGLE_CLIENT_ID` 
- ✅ `GOOGLE_CLIENT_SECRET`
- ❌ `GOOGLE_REFRESH_TOKEN` (vazio)

## Como Obter o Refresh Token

### Opção 1: Via Script (Recomendado)

1. Execute o script de teste:
```bash
node test-auth.js
```

2. Copie a URL que aparecer no console

3. Abra a URL no navegador

4. Faça login com sua conta Google

5. Autorize o acesso ao Google Drive

6. Você será redirecionado para uma página com o refresh token

7. Copie o token e adicione ao arquivo `.env`:
```env
GOOGLE_REFRESH_TOKEN=seu_token_aqui
```

### Opção 2: Via API Direta

1. Acesse: `http://localhost:3000/api/auth/login`

2. Você receberá uma URL de autenticação

3. Abra a URL no navegador e siga os passos acima

## Após Configurar o Token

1. Salve o arquivo `.env`

2. Reinicie o servidor Next.js (se estiver rodando)

3. Teste novamente:
```bash
node test-sync.js
```

## Testes Disponíveis

### Teste de Listagem (GET)
```bash
node test-sync.js
```
Ou acesse: `http://localhost:3000/api/sync`

### Teste de Sincronização (POST)
A sincronização automática já está configurada e funcionará automaticamente quando:
- O app carregar (se estiver online)
- A conexão voltar (evento online)
- A cada 30 minutos (enquanto online)

## Verificar se Está Funcionando

Os logs aparecerão no console do navegador (F12) com prefixo `[AutoSync]`:
- `[AutoSync] Conexão detectada, iniciando sync...`
- `[AutoSync] Sync concluído: X baixados, Y ignorados, Z erros`

## Nota Importante

⚠️ **Antes de testar, certifique-se de que:**
1. O `GOOGLE_REDIRECT_URI` no `.env` está configurado como `http://localhost:3000/api/auth/callback`
2. O mesmo URI está configurado no Google Cloud Console nas credenciais OAuth2
3. A API do Google Drive está ativada no projeto do Google Cloud

