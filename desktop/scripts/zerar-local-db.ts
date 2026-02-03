/**
 * Zera todas as tabelas do SQLite local (musicas_local, historico_local, ativacao_local).
 * Rodar com o app parado para evitar "database is locked".
 *
 * Uso: bun run db:zerar   ou   npx tsx scripts/zerar-local-db.ts
 */

import { localDb } from "../lib/db/local-db"
import { musicasLocal, historicoLocal, ativacaoLocal } from "../lib/db/local-schema"

async function zerar() {
  try {
    console.log("Zerando banco SQLite local...")

    const r1 = await localDb.delete(historicoLocal)
    console.log("  historico_local:", (r1.changes ?? 0), "registros removidos")

    const r2 = await localDb.delete(musicasLocal)
    console.log("  musicas_local:", (r2.changes ?? 0), "registros removidos")

    const r3 = await localDb.delete(ativacaoLocal)
    console.log("  ativacao_local:", (r3.changes ?? 0), "registros removidos")

    console.log("Banco zerado.")
    process.exit(0)
  } catch (err) {
    console.error("Erro:", err)
    process.exit(1)
  }
}

zerar()
