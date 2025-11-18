,# Setup Completo - Blue Karaoke Desktop App

## ✅ Status

Tudo está configurado e funcionando! O app está pronto para desenvolvimento e pode ser compilado para produção.

## 🚀 Como Usar

### Desenvolvimento

```bash
# 1. Inicializar banco de dados (primeira vez apenas)
bun run db:init

# 2. Rodar o app Electron em desenvolvimento
bun run electron:dev
```

### Build para Produção

```bash
# Build completo (gera instalador)
bun run electron:build

# Build sem instalador (apenas pasta com app)
bun run electron:pack
```

## 📁 Estrutura

### Desenvolvimento
- **Banco de dados**: `db.sqlite` na raiz do projeto
- **Músicas**: pasta `musicas/` na raiz do projeto

### Produção (App Instalado)
- **Windows**: 
  - Banco: `%APPDATA%/blue-karaoke/db.sqlite`
  - Músicas: `%APPDATA%/blue-karaoke/musicas/`
- **macOS**: 
  - Banco: `~/Library/Application Support/blue-karaoke/db.sqlite`
  - Músicas: `~/Library/Application Support/blue-karaoke/musicas/`

## 🔧 Scripts Disponíveis

- `bun run db:init` - Inicializar banco de dados (primeira vez)
- `bun run db:generate` - Gerar migrações do Drizzle
- `bun run db:studio` - Abrir Drizzle Studio
- `bun run electron:dev` - Desenvolvimento (Next.js + Electron)
- `bun run electron:build` - Build completo para distribuição
- `bun run electron:pack` - Build sem instalador
- `bun run electron:rebuild` - Recompilar módulos nativos para Electron

## ⚠️ Nota sobre better-sqlite3

O `better-sqlite3` funciona perfeitamente em desenvolvimento. Para produção com Electron, pode ser necessário executar `bun run electron:rebuild` após instalar dependências, mas isso é opcional se você não estiver fazendo build de produção imediatamente.

## ✨ Funcionalidades

- ✅ App desktop completo com Electron
- ✅ Funciona 100% offline
- ✅ Banco de dados SQLite local
- ✅ Sistema de códigos de música
- ✅ Player de vídeo (suporta arquivos locais e YouTube)
- ✅ Sistema de notas e histórico
- ✅ API de sync do Google Drive (quando online)
- ✅ Interface moderna e responsiva

## 🎯 Próximos Passos

1. Execute `bun run db:init` para criar o banco
2. Execute `bun run electron:dev` para rodar em desenvolvimento
3. Quando estiver pronto, execute `bun run electron:build` para gerar o instalador

Tudo está configurado e pronto para uso! 🎉

