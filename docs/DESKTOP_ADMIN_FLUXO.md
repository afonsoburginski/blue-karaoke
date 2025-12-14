## Visão Geral - Admin + Desktop (Chaves de Ativação)

Este documento descreve **o que já foi concluído** e **o que ainda falta** para implementar o fluxo completo:

- **Admin**: gerenciar tudo, ver novos usuários, tipos e assinaturas, criar usuários para máquinas físicas de karaokê.
- **Desktop**: dois modos (assinante e máquina física) usando **chave de ativação** + sincronização de músicas e histórico com o painel admin.

---

## 1. O que já está concluído

### 1.1. Banco de dados

- **Tabela `users`**
  - Suporta:
    - Admin, assinantes e máquinas:
      - `role`: `"user" | "admin" | "machine"`.
      - `userType`: `"subscriber" | "machine"`.
      - `isActive`: usuário ativo/inativo.
    - Campos compatíveis com Better Auth:
      - `email`, `password`, `emailVerified`, `image`, `username`, `displayUsername`.
    - Campos do sistema:
      - `slug` (usado nas rotas), `avatar`, `createdAt`, `updatedAt`.

- **Tabela `assinaturas`**
  - Relacionada a `users` (`userId`).
  - Campos:
    - `plano`, `status` (`ativa`, `cancelada`, `expirada`), `dataInicio`, `dataFim`, `valor`, `renovacaoAutomatica`.

- **Tabela `chaves_ativacao`**
  - Chaves para:
    - **Assinatura** (`tipo = "assinatura"`).
    - **Máquina física** (`tipo = "maquina"`).
  - Campos:
    - `chave` (única), `userId` (opcional), `tipo`, `status` (`ativa`, `expirada`, `revogada`),
      `limiteTempo` (horas, para máquinas), `dataInicio`, `dataExpiracao`, `criadoPor`, `usadoEm`, `ultimoUso`.

- **Tabela `musicas`**
  - Catálogo de músicas (código, artista, título, arquivo, tamanho, duração, `userId`, timestamps).

- **Tabela `historico`**
  - Registro de execuções de músicas:
    - `userId`, `musicaId`, `codigo`, `nota`, `dataExecucao`.

- **Tabela `estatisticas`**
  - Cache de totais: `totalUsuarios`, `totalMusicas`, `totalGb`, `receitaMensal`, por usuário/mês.

- **Tabela `sincronizacoes`**
  - Log das sincronizações do **desktop** com o **admin**:
    - `userId`, `tipo` (`musica`, `historico`, `completa`), `dados` (JSON), `status`, `dataSincronizacao`.

- **Tabelas Better Auth**
  - `session`, `account`, `verification` para gerenciar sessões e integrações futuras.

- **Migrations**
  - Arquivos `0000`, `0001`, `0002` gerados (Drizzle) com todas as tabelas.
  - Falta apenas rodar no banco:

  ```bash
  bun run db:migrate
  ```

---

### 1.2. Autenticação (Better Auth)

- **Backend**
  - Better Auth configurado com:
    - `drizzleAdapter(db, { provider: "pg" })`.
    - Plugin `username` habilitado.
    - `user.modelName = "users"` apontando para nossa tabela.
    - Mapeamento de campos (`email`, `name`, `image`, `emailVerified`).
    - Hook `afterCreate`:
      - Gera `slug` automaticamente a partir do nome/email usando `createSlug`.
      - Atualiza o usuário no banco com o `slug`.
  - Sessões configuradas (7 dias).
  - Rota de autenticação:
    - `src/app/api/auth/[...all]/route.ts` com `toNextJsHandler(auth)`.

- **Cliente Web**
  - `authClient` em `src/lib/auth-client.ts` usando `createAuthClient` do `better-auth/react`.
  - `useAuth` em `src/hooks/use-auth.ts`:
    - Usa `authClient.getSession()` para recuperar o usuário atual.
    - Monta objeto `user { id, slug, name, email, avatar, role }`.

- **Páginas**
  - **Login `/login`**
    - Usa `authClient.signIn.email({ email, password })`.
    - Em sucesso:
      - Gera `slug` com `createSlug`.
      - Salva `userEmail`, `userName`, `userSlug` em `localStorage`.
      - Redireciona para `/${slug}`.
  - **Cadastro `/cadastro`**
    - Usa `authClient.signUp.email({ email, password, name, username, displayUsername })`.
    - Gera `username`/`slug` a partir do nome.
    - Salva dados no `localStorage` e redireciona para `/${slug}`.
  - **Logout (sidebar)**
    - Chama `authClient.signOut()`.
    - Limpa `localStorage` e envia o usuário para `/login`.

---

### 1.3. Painel Admin (Web)

#### 1.3.1. Gerenciamento de usuários

- **API `GET /api/admin/usuarios`**
  - Lista todos os usuários com:
    - `id, slug, name, email, avatar, role, userType, isActive, createdAt, updatedAt`.
    - Assinatura associada (`assinaturas`) se existir.
  - Filtros:
    - `tipo`: `subscriber`, `machine`, `all`.
    - `status`: `active`, `inactive`, `all`.
  - Proteção:
    - Apenas `role = "admin"` (sessão do Better Auth + checagem em `users`).

- **API `POST /api/admin/usuarios`**
  - Permite ao admin criar:
    - Usuários assinantes.
    - Usuários do tipo máquina (`userType = "machine"`).
  - Valida email único e slug único.

- **Página `/[slug]/admin/usuarios`**
  - Lista:
    - Nome, email, tipo (assinante/máquina), status (ativo/inativo), dados da assinatura, data de criação.
  - Filtros de tipo e status.
  - Dialog “Criar Usuário”:
    - Form com nome, email, senha, tipo (`subscriber`/`machine`).

#### 1.3.2. Gerenciamento de chaves de ativação

- **Utilitário `src/lib/utils/chave-ativacao.ts`**
  - Gera chaves no formato `XXXX-XXXX-XXXX-XXXX`.
  - Normaliza e valida formato.

- **API `GET /api/admin/chaves`**
  - Lista chaves com:
    - Tipo (`assinatura` | `maquina`), status, limite tempo, datas, usuário vinculado.
  - Filtros:
    - `tipo`: `assinatura`, `maquina`, `all`.
    - `status`: `ativa`, `expirada`, `revogada`, `all`.
  - Protegida para admin.

- **API `POST /api/admin/chaves`**
  - Cria nova chave:
    - Tipo `assinatura`:
      - Exige `dataExpiracao`.
      - Opcionalmente associa a um `userId` (assinante).
    - Tipo `maquina`:
      - Exige `limiteTempo` (horas).
    - Garante chave única.
    - Atribui `criadoPor = admin` logado.

- **Página `/[slug]/admin/chaves`**
  - Tabela com:
    - Chave, tipo, status, limite/expiração, usuário vinculado, último uso.
  - Filtros por tipo e status.
  - Dialog “Criar Chave”:
    - Form para tipo `assinatura` ou `maquina`.
  - Card com última chave criada + botão de copiar.

#### 1.3.3. Dashboard, músicas, histórico e perfil

- **Dashboard `/[slug]`**
  - Integra com:
    - `GET /api/estatisticas`.
    - `GET /api/musicas/top?timeFilter=week|month|year`.
  - Mostra:
    - Total de usuários, músicas, GB, receita mensal.
    - Músicas mais tocadas (semana/mês/ano).
    - Novos usuários.

- **Músicas `/[slug]/musicas`**
  - Tabela de músicas + dialog com dropzone gigante para upload.
  - API base:
    - `GET /api/musicas`, `POST /api/musicas`, `DELETE /api/musicas/[id]`.

- **Histórico `/[slug]/historico`**
  - Página de histórico (UI pronta; integração com API ainda parcial).

- **Perfil `/[slug]/perfil`**
  - Integra com:
    - `GET /api/users/me`.
    - `PUT /api/users/profile`.
  - Atualiza nome, email, senha e avatar.

---

### 1.4. Backend para Desktop (ativação + sincronização)

#### 1.4.1. Validação de chave de ativação

- **API `POST /api/ativacao/validar`**
  - Entrada:
    - `{ chave }`.
  - Passos:
    1. Normaliza a chave (`normalizarChave`) e valida formato.
    2. Busca em `chaves_ativacao`.
    3. Regras por tipo:
       - **Tipo `assinatura`**:
         - Se `dataExpiracao < agora`:
           - Marca como `expirada`.
           - Retorna erro de chave expirada.
         - Se tiver `userId`:
           - Verifica assinatura ativa em `assinaturas` (`status = "ativa"`).
       - **Tipo `maquina`**:
         - Se tem `limiteTempo` e `dataInicio`:
           - Calcula horas usadas = `(agora - dataInicio)` em horas.
           - Se horas usadas >= `limiteTempo`:
             - Marca chave como `expirada`.
             - Retorna erro.
         - Se tem `limiteTempo` e **não** tem `dataInicio`:
           - Considera primeira utilização:
             - Define `dataInicio`, `usadoEm`, `ultimoUso` = agora.
         - Senão:
           - Atualiza apenas `ultimoUso = agora`.
    4. Retorno:
       - `valida: true`.
       - Dados da chave (tipo, limite, datas, `horasRestantes` se máquina).
       - Dados do usuário vinculado (se houver).

> Isso já cobre a lógica que você pediu:
> - **Modo 1 (assinante)**: chave expira junto com a assinatura (via `dataExpiracao`).
> - **Modo 2 (máquina)**: chave expira por limite de horas/dias corridos após o primeiro uso (`dataInicio` + `limiteTempo`).

#### 1.4.2. Sincronização Desktop ↔ Admin

- **API `POST /api/sync`**
  - Entrada:
    - `{ chave, tipo, dados }`.
  - Passos:
    1. Valida chave (`chaves_ativacao` status `ativa`).
    2. Cria registro em `sincronizacoes` (status `pendente`).
    3. Se `tipo` = `"musica"` ou `"completa"`:
       - Para cada item em `dados.musicas`:
         - Se não existir `musicas.codigo`, cria registro em `musicas` com:
           - `codigo`, `artista`, `titulo`, `arquivo`, `nomeArquivo`, `tamanho`, `duracao`, `userId`.
    4. Se `tipo` = `"historico"` ou `"completa"`:
       - Para cada item em `dados.historico`:
         - Busca `musicas.codigo`.
         - Se achar e houver `userId`:
           - Cria registro em `historico` com `userId`, `musicaId`, `codigo`, `nota`, `dataExecucao`.
    5. Atualiza `sincronizacoes.status = "processada"`.

- **API `GET /api/sync?chave=...`**
  - Valida chave.
  - Retorna lista de músicas em `musicas` (id, código, artista, título, arquivo, tamanho, duração, createdAt).
  - Isso é o que o **app desktop** usa para:
    - Baixar novas músicas.
    - Manter o catálogo local sincronizado com o admin.

---

## 2. O que falta implementar

### 2.1. Backend / Admin

- **Integrar criação de usuário admin/máquina 100% com Better Auth**
  - Hoje a API `POST /api/admin/usuarios` ainda replica a lógica antiga de senha.
  - Ideal:
    - Usar Better Auth para criação (ou chamar internamente os métodos de signup) e só ajustar `role`/`userType` no banco.

- **Fluxo real de cobrança e assinaturas**
  - Hoje:
    - `assinaturas` e `chaves_ativacao` para assinatura já existem.
  - Falta:
    - Integração com gateway de pagamento (webhooks) para:
      - Marcar `assinaturas.status` corretamente.
      - Revogar / criar novas chaves de assinatura automaticamente mês a mês.

- **Tela de monitoramento de máquinas físicas**
  - Uma página dedicada, por exemplo `/[slug]/admin/maquinas`:
    - Mostrar:
      - Máquinas por chave, limite de horas, horas usadas, previsão de expiração.
      - Última sincronização (via tabela `sincronizacoes`).

### 2.2. Aplicativo Desktop (cliente)

Nada do **app desktop** em si foi implementado ainda; apenas o **backend** e regras.

Falta, no desktop:

- **Tela inicial de chave**
  - Input para chave de ativação.
  - Chamar `POST /api/ativacao/validar`.
  - Guardar localmente:
    - chave, tipo (`assinatura` | `maquina`), `limiteTempo`, `dataInicio`, `dataExpiracao`, info do usuário.

- **Modo 1 – Desktop assinante**
  - Controle local de expiração por `dataExpiracao`.
  - Opcional:
    - Revalidar com `POST /api/ativacao/validar` de tempos em tempos (principalmente após ficar offline).
  - Ao expirar:
    - Deslogar, limpar dados locais, voltar à tela de chave.

- **Modo 2 – Máquina física**
  - Controle local de tempo corrido:
    - A partir de `dataInicio` + `limiteTempo` (em horas).
    - Mesmo offline:
      - Calcular `horasDecorridas` pelo relógio local.
      - Quando `>= limite`, desconectar e retornar à tela de chave.
  - Quando online:
    - Chamar `POST /api/ativacao/validar` para manter status da chave (expirada/ativa) no servidor.

- **Sincronização de músicas**
  - Buscar catálogo:
    - `GET /api/sync?chave=...` → baixar/atualizar arquivos locais.
  - Enviar informações de download (se necessário) via `POST /api/sync` (`tipo = "musica"` ou `"completa"`).

- **Sincronização de histórico**
  - Registrar localmente cada música executada.
  - Quando tiver conexão:
    - Enviar via `POST /api/sync` (`tipo = "historico"` ou `"completa"`).
  - Manter fila local para funcionamento offline.

- **Proteção mínima contra manipulação de relógio (opcional)**
  - Comparar horários do servidor vs. cliente em cada validação.
  - Se detectar retrocesso grande, forçar revalidação online imediata.

---

## 3. Próximos passos sugeridos

1. **Rodar migrations** (se ainda não fez):

```bash
bun run db:migrate
```

2. **Testar o fluxo admin completo no browser**:
   - Criar usuários (`/admin/usuarios`).
   - Criar chaves de assinatura e máquinas (`/admin/chaves`).
   - Validar chaves via `POST /api/ativacao/validar` usando ferramentas tipo Thunder Client/Postman.

3. **Começar o app Desktop**:
   - Criar um protótipo simples:
     - Tela de chave → chama `/api/ativacao/validar`.
     - Tela de catálogo → chama `/api/sync` (GET/POST).
   - Implementar a lógica de expiração local (horas corridas / data de expiração).


