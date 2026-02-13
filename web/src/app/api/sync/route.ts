import { NextRequest, NextResponse } from "next/server"
import { db, sincronizacoes, musicas, historico, chavesAtivacao } from "@/lib/db"
import { eq } from "drizzle-orm"
import { normalizarChave } from "@/lib/utils/chave-ativacao"

// Sincronizar dados do desktop com o admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chave, tipo, dados } = body

    if (!chave || !tipo || !dados) {
      return NextResponse.json(
        { error: "Chave, tipo e dados são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar chave
    const chaveNormalizada = normalizarChave(chave)
    const [chaveData] = await db
      .select()
      .from(chavesAtivacao)
      .where(eq(chavesAtivacao.chave, chaveNormalizada))
      .limit(1)

    if (!chaveData || chaveData.status !== "ativa") {
      return NextResponse.json(
        { error: "Chave de ativação inválida ou inativa" },
        { status: 401 }
      )
    }

    // Criar registro de sincronização
    const [sync] = await db
      .insert(sincronizacoes)
      .values({
        userId: chaveData.userId || chaveData.criadoPor,
        tipo,
        dados: JSON.stringify(dados),
        status: "pendente",
      })
      .returning()

    // Processar sincronização baseado no tipo
    if (tipo === "musica" || tipo === "completa") {
      // Sincronizar músicas baixadas
      if (dados.musicas && Array.isArray(dados.musicas)) {
        for (const musica of dados.musicas) {
          // Verificar se música já existe
          const [existing] = await db
            .select()
            .from(musicas)
            .where(eq(musicas.codigo, musica.codigo))
            .limit(1)

          if (!existing) {
            // Criar música se não existir
            await db.insert(musicas).values({
              codigo: musica.codigo,
              artista: musica.artista,
              titulo: musica.titulo,
              arquivo: musica.arquivo,
              nomeArquivo: musica.nomeArquivo,
              tamanho: musica.tamanho,
              duracao: musica.duracao,
              userId: chaveData.userId || chaveData.criadoPor,
            })
          }
        }
      }
    }

    if (tipo === "historico" || tipo === "completa") {
      // userId: chave pode ser de máquina sem usuário; usar criadoPor para não perder histórico
      const historicoUserId = chaveData.userId || chaveData.criadoPor
      if (dados.historico && Array.isArray(dados.historico) && historicoUserId) {
        for (const item of dados.historico) {
          const codigo = String(item.codigo ?? "").trim()
          if (!codigo) continue

          let [musica] = await db
            .select()
            .from(musicas)
            .where(eq(musicas.codigo, codigo))
            .limit(1)

          // Se a música não existir no catálogo, criar registro placeholder para não perder histórico
          if (!musica) {
            await db
              .insert(musicas)
              .values({
                codigo,
                artista: "–",
                titulo: "Música não cadastrada",
                arquivo: "",
                userId: historicoUserId,
              })
              .onConflictDoNothing({ target: [musicas.codigo] })
            const [aposInsert] = await db
              .select()
              .from(musicas)
              .where(eq(musicas.codigo, codigo))
              .limit(1)
            musica = aposInsert ?? undefined
          }

          if (!musica) continue

          const dataExecucaoRaw = item.dataExecucao ?? item.data_execucao
          const dataExecucao =
            dataExecucaoRaw != null
              ? new Date(typeof dataExecucaoRaw === "number" ? dataExecucaoRaw : dataExecucaoRaw)
              : new Date()

          await db.insert(historico).values({
            userId: historicoUserId,
            musicaId: musica.id,
            codigo,
            dataExecucao,
          })
        }
      }
    }

    // Atualizar status da sincronização
    await db
      .update(sincronizacoes)
      .set({ status: "processada" })
      .where(eq(sincronizacoes.id, sync.id))

    return NextResponse.json({
      success: true,
      message: "Sincronização realizada com sucesso",
      syncId: sync.id,
    })
  } catch (error) {
    console.error("Erro ao sincronizar:", error)
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
      { status: 500 }
    )
  }
}

// Buscar dados para sincronização (desktop busca do admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chave = searchParams.get("chave")

    if (!chave) {
      return NextResponse.json(
        { error: "Chave de ativação é obrigatória" },
        { status: 400 }
      )
    }

    // Validar chave
    const chaveNormalizada = normalizarChave(chave)
    const [chaveData] = await db
      .select()
      .from(chavesAtivacao)
      .where(eq(chavesAtivacao.chave, chaveNormalizada))
      .limit(1)

    if (!chaveData || chaveData.status !== "ativa") {
      return NextResponse.json(
        { error: "Chave de ativação inválida ou inativa" },
        { status: 401 }
      )
    }

    // Buscar músicas disponíveis
    const allMusicas = await db.select().from(musicas)

    return NextResponse.json({
      musicas: allMusicas.map((m) => ({
        id: m.id,
        codigo: m.codigo,
        artista: m.artista,
        titulo: m.titulo,
        arquivo: m.arquivo,
        nomeArquivo: m.nomeArquivo,
        tamanho: m.tamanho,
        duracao: m.duracao,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error("Erro ao buscar dados para sincronização:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}

