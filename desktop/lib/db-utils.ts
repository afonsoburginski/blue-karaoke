import { db } from "@/lib/db"
import { musicas, historico } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export async function getMusicaByCodigo(codigo: string): Promise<Musica | null> {
  const result = await db.select().from(musicas).where(eq(musicas.codigo, codigo)).limit(1)
  
  if (result.length === 0) {
    return null
  }

  const musica = result[0]
  return {
    codigo: musica.codigo,
    artista: musica.artista,
    titulo: musica.titulo,
    arquivo: musica.arquivo,
  }
}

export async function salvarHistorico(codigo: string, nota: number) {
  await db.insert(historico).values({
    codigo,
    nota,
    dataExecucao: new Date(),
  })
}

export async function getAllMusicas(): Promise<Musica[]> {
  const result = await db.select().from(musicas)
  
  return result.map((musica) => ({
    codigo: musica.codigo,
    artista: musica.artista,
    titulo: musica.titulo,
    arquivo: musica.arquivo,
  }))
}
