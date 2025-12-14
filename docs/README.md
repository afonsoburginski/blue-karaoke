## Documentação Geral do Projeto

Esta pasta `docs/` é a **fonte única de verdade** da documentação de TODO o projeto:

- **`web/`** – painel admin (Next.js, Better Auth, Postgres, Drizzle, APIs).
- **`desktop/`** – app desktop (Next.js/Electron + SQLite) que consome as APIs e faz sync.

O objetivo é ter aqui:

- As regras de negócio completas (admin + desktop + sincronização).
- A visão de infraestrutura (banco, serviços, integrações).
- Guias para implementar funcionalidades faltantes e planejar o futuro.

### Documentos atuais

- `desktop-admin-fluxo.md`  
  Descreve em detalhes:
  - O que já foi feito e o que falta para o fluxo **Admin ↔ Desktop**.  
  - Regras de:
    - Usuários, assinaturas, chaves de ativação.  
    - Modos do desktop (assinante x máquina física).  
    - Sincronização de músicas e histórico.

> Toda doc nova que descreve regra de negócio, infra ou features deve ser criada **aqui dentro de `docs/`**, nunca solta dentro de `web/` ou `desktop/`.


