<!-- Conteúdo copiado de desktop/ELECTRON_README.md -->

# Blue Karaoke - Desktop App (Electron)

Aplicação desktop construída com Electron e Next.js, funcionando completamente offline.

## 🚀 Desenvolvimento

### Pré-requisitos

- Node.js 18+ ou Bun
- Todas as dependências do projeto instaladas

### Rodar em Modo Desenvolvimento

```bash
# Instalar dependências (se ainda não instalou)
bun install

# Inicializar banco de dados (primeira vez)
bun run db:init

# Rodar o app Electron em modo desenvolvimento
bun run electron:dev
```

Este comando irá:
1. Iniciar o servidor Next.js em `http://localhost:3000`
2. Aguardar o servidor estar pronto
3. Abrir a janela do Electron

## 📦 Build para Produção

### Build do Next.js + Electron

```bash
# Build completo (gera instalador)
bun run electron:build

# Build sem instalador (apenas pasta com app)
bun run electron:pack
```

Os arquivos serão gerados na pasta `dist/`:
- **Windows**: `.exe` instalador (NSIS)
- **macOS**: `.dmg`
- **Linux**: `.AppImage`

## 📁 Estrutura de Arquivos no Electron

### Desenvolvimento
- Banco de dados: `db.sqlite` na raiz do projeto
- Músicas: pasta `musicas/` na raiz do projeto

### Produção (App Instalado)
- Banco de dados: `%APPDATA%/blue-karaoke/db.sqlite` (Windows) ou `~/Library/Application Support/blue-karaoke/db.sqlite` (macOS)
- Músicas: `%APPDATA%/blue-karaoke/musicas/` (Windows) ou `~/Library/Application Support/blue-karaoke/musicas/` (macOS)

## 🔧 Funcionalidades Offline

O app funciona completamente offline:
- ✅ Banco de dados SQLite local
- ✅ Arquivos de música armazenados localmente
- ✅ Interface Next.js servida localmente
- ✅ Sem necessidade de servidor remoto

## 📝 Scripts Disponíveis

- `bun run electron:dev` - Desenvolvimento (Next.js + Electron)
- `bun run electron:build` - Build completo para distribuição
- `bun run electron:pack` - Build sem instalador
- `bun run db:init` - Inicializar banco de dados
- `bun run db:generate` - Gerar migrações
- `bun run db:studio` - Abrir Drizzle Studio

## 🐛 Troubleshooting

### App não inicia

1. Verifique se o banco de dados foi inicializado: `bun run db:init`
2. Verifique os logs no console do Electron (DevTools)
3. Certifique-se de que a porta 3000 não está em uso

### Arquivos não são encontrados

- Em desenvolvimento: arquivos devem estar na raiz do projeto
- Em produção: arquivos são salvos no diretório `userData` do Electron
- Verifique os logs para ver o caminho exato usado

### Build falha

1. Certifique-se de que o build do Next.js foi concluído: `bun run build`
2. Verifique se a pasta `.next/standalone` existe
3. Verifique os logs do electron-builder

## 📦 Distribuição

Após o build, os instaladores estarão em:
- Windows: `dist/Blue Karaoke Setup X.X.X.exe`
- macOS: `dist/Blue Karaoke-X.X.X.dmg`
- Linux: `dist/Blue Karaoke-X.X.X.AppImage`

## 🔐 Segurança

- Context isolation habilitado
- Node integration desabilitado
- Web security habilitado
- Preload script para comunicação segura

## 📄 Licença

[Adicione sua licença aqui]


