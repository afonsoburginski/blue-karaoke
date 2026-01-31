# Publicar versão no GitHub (auto-atualização)

O app Blue Karaoke usa **electron-updater** para verificar e instalar atualizações a partir de **releases** no GitHub. O usuário vê a opção em **Configurações (F12)** → **Atualizações**.

---

## Lançar atualização automaticamente (recomendado)

Existe um **GitHub Actions** na raiz do repositório (`.github/workflows/release-desktop.yml`) que faz o build no Windows e publica a release.

### Opção A: A cada commit em `main`

Qualquer **push na branch `main`** dispara o workflow. A versão da release é **1.0.&lt;número da execução&gt;** (ex.: 1.0.42, 1.0.43).

```bash
git add .
git commit -m "Sua alteração"
git push origin main
```

O workflow roda sozinho, gera o instalador e publica a release. Os usuários veem a atualização em **Configurações** → **Verificar atualizações**.

### Opção B: Só quando você envia uma tag `v*`

Se quiser controlar a versão manualmente:

1. **Ajuste a versão** em `desktop/package.json` (ex.: `1.0.0` → `1.0.1`).
2. **Commit, push e crie a tag:**
   ```bash
   git add desktop/package.json
   git commit -m "Release 1.0.1"
   git push origin main
   git tag v1.0.1
   git push origin v1.0.1
   ```

A release será criada com a versão da tag (ex.: `v1.0.1` → versão `1.0.1`).

O `GITHUB_TOKEN` já é fornecido pelo GitHub Actions; não é preciso configurar token manualmente.

---

## Configuração inicial (uma vez)

1. **Repositório no GitHub**  
   Crie o repositório (ex.: `blue-karaoke`) e faça o push do código.

2. **`package.json`**  
   Ajuste o campo `repository` com seu usuário/organização e nome do repo:
   ```json
   "repository": { "type": "git", "url": "https://github.com/SEU_USUARIO/blue-karaoke.git" }
   ```

3. **`electron-builder.config.js`**  
   O `publish` já está configurado com fallback. Para definir owner/repo via variáveis de ambiente (recomendado em CI):
   - `GH_OWNER`: usuário ou organização (ex.: `minha-empresa`)
   - `GH_REPO`: nome do repositório (ex.: `blue-karaoke`)

   Ou edite direto no config, trocando `SEU_USUARIO` pelo seu usuário do GitHub.

## Como publicar uma nova versão (manual)

Se não quiser usar o GitHub Actions, faça assim:

1. **Atualizar a versão no `package.json`**  
   Ex.: de `1.0.0` para `1.1.0` (semântico: MAJOR.MINOR.PATCH).

2. **Build do instalador (Windows)**  
   Na pasta `desktop`:
   ```bash
   npm run electron:build:win
   ```
   Os artefatos ficam em `desktop/release/`.

3. **Criar a release no GitHub**  
   - Abra o repositório no GitHub → **Releases** → **Create a new release**.
   - **Tag:** use a versão com `v` (ex.: `v1.1.0`).  
     O electron-updater espera tags com prefixo `v` (`vPrefixedTagName: true`).
   - **Title:** ex. `v1.1.0` ou "Versão 1.1.0".
   - **Description:** descreva as mudanças.
   - Em **Assets**, faça upload dos arquivos gerados em `release/`, por exemplo:
     - `Blue Karaoke Setup 1.1.0.exe` (instalador NSIS)
     - `latest.yml` (metadados para o auto-updater; gerado pelo electron-builder)

4. **Publicar**  
   Clique em **Publish release**.

Após isso, os usuários que já têm o app instalado podem abrir **Configurações (F12)** → **Verificar atualizações** e, se houver versão nova, **Reiniciar e instalar**.

## Resumo

| Passo | Ação |
|-------|------|
| 1 | Ajustar `version` em `package.json` |
| 2 | Rodar `npm run electron:build:win` (ou o script do seu SO) |
| 3 | No GitHub: Releases → New release, tag `vX.Y.Z` |
| 4 | Anexar os arquivos de `release/` (incluindo `latest.yml`) e publicar |

O `latest.yml` é essencial: o electron-updater usa esse arquivo para saber a versão e o link do instalador.
