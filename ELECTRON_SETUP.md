# Setup do Electron - Blue Karaoke

## ⚠️ Problema com better-sqlite3 e Electron

O `better-sqlite3` precisa ser compilado separadamente para Node.js (desenvolvimento) e Electron (produção). 

### Desenvolvimento

Para desenvolvimento, o `better-sqlite3` funciona normalmente com Node.js/Bun:

```bash
# Inicializar banco de dados
bun run db:init

# Rodar em desenvolvimento
bun run electron:dev
```

### Build para Produção

Para fazer o build do Electron, você precisa compilar o `better-sqlite3` para Electron:

```bash
# Compilar better-sqlite3 para Electron (pode falhar devido a incompatibilidade de versão)
bun run electron:rebuild

# Se o rebuild falhar, você pode:
# 1. Usar uma versão mais antiga do Electron (recomendado)
# 2. Ou usar uma alternativa como @libsql/client (não requer compilação nativa)
```

## Solução Alternativa: Usar @libsql/client

Se o `better-sqlite3` continuar dando problemas, podemos migrar para `@libsql/client` que não requer compilação nativa e funciona melhor com Electron.

## Status Atual

- ✅ Desenvolvimento funciona normalmente
- ⚠️ Build do Electron pode falhar devido a incompatibilidade do better-sqlite3 com Electron 39.2.1
- 💡 Solução: Considerar downgrade do Electron ou migração para @libsql/client

