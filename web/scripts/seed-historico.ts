import * as dotenv from "dotenv"
import path from "path"
import { db, historico, musicas, users } from "../src/lib/db"
import { eq, desc, sql, count } from "drizzle-orm"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function seedHistorico() {
  try {
    console.log("🌱 Criando dados de histórico de reproduções...")

    // Buscar usuário admin (afonsoburginski@gmail.com)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "afonsoburginski@gmail.com"))
      .limit(1)

    if (!user) {
      console.error("❌ Usuário não encontrado. Certifique-se de que o usuário existe.")
      process.exit(1)
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.email})`)

    // Buscar algumas músicas do banco
    const musicasList = await db
      .select()
      .from(musicas)
      .limit(30) // Pegar 30 músicas para ter mais variedade

    if (musicasList.length === 0) {
      console.error("❌ Nenhuma música encontrada no banco. Importe músicas primeiro.")
      process.exit(1)
    }

    console.log(`✅ Encontradas ${musicasList.length} músicas`)

    // Criar histórico de reproduções para as últimas 2 semanas
    const now = new Date()
    const historicosParaCriar = []

    // Criar reproduções variadas ao longo dos últimos 14 dias
    for (let day = 0; day < 14; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() - day)
      
      // 3-8 reproduções por dia (mais realista)
      const reproducoesPorDia = Math.floor(Math.random() * 6) + 3
      
      for (let i = 0; i < reproducoesPorDia; i++) {
        // Selecionar música aleatória
        const musicaAleatoria = musicasList[Math.floor(Math.random() * musicasList.length)]
        
        // Criar timestamp aleatório no dia
        const hora = Math.floor(Math.random() * 24)
        const minuto = Math.floor(Math.random() * 60)
        const segundo = Math.floor(Math.random() * 60)
        
        const dataExecucao = new Date(date)
        dataExecucao.setHours(hora, minuto, segundo, 0)

        historicosParaCriar.push({
          userId: user.id,
          musicaId: musicaAleatoria.id,
          codigo: musicaAleatoria.codigo,
          dataExecucao,
        })
      }
    }

    console.log(`📝 Criando ${historicosParaCriar.length} registros de histórico...`)

    // Inserir em lotes para melhor performance
    const batchSize = 50
    let inseridos = 0
    let duplicatas = 0

    for (let i = 0; i < historicosParaCriar.length; i += batchSize) {
      const batch = historicosParaCriar.slice(i, i + batchSize)
      
      try {
        await db.insert(historico).values(batch)
        inseridos += batch.length
        console.log(`   → Inseridos ${inseridos}/${historicosParaCriar.length} registros...`)
      } catch (error: any) {
        // Ignorar duplicatas
        if (error.code === "23505") {
          duplicatas += batch.length
        } else {
          console.error(`   ⚠️ Erro ao inserir lote:`, error.message)
        }
      }
    }

    console.log(`\n✅ Histórico criado com sucesso!`)
    console.log(`   → Total de reproduções inseridas: ${inseridos}`)
    if (duplicatas > 0) {
      console.log(`   → Registros duplicados ignorados: ${duplicatas}`)
    }
    console.log(`   → Período: últimos 14 dias`)
    console.log(`   → Usuário: ${user.name} (${user.email})`)

    // Mostrar estatísticas
    const totalHistoricoResult = await db
      .select({ count: count() })
      .from(historico)
      .where(eq(historico.userId, user.id))

    console.log(`\n📊 Estatísticas:`)
    console.log(`   → Total de reproduções do usuário: ${totalHistoricoResult[0]?.count || 0}`)

    // Buscar músicas mais tocadas
    const maisTocadasQuery = await db
      .select({
        codigo: historico.codigo,
        vezesTocada: sql<number>`count(*)::int`.as("vezes_tocada"),
        titulo: musicas.titulo,
        artista: musicas.artista,
      })
      .from(historico)
      .leftJoin(musicas, eq(historico.musicaId, musicas.id))
      .where(eq(historico.userId, user.id))
      .groupBy(historico.codigo, musicas.titulo, musicas.artista)
      .orderBy(desc(sql`count(*)`))
      .limit(5)

    const maisTocadas = maisTocadasQuery.map(item => ({
      codigo: item.codigo,
      vezesTocada: Number(item.vezesTocada),
      titulo: item.titulo || "Desconhecida",
      artista: item.artista || "Desconhecido",
    }))

    if (maisTocadas.length > 0) {
      console.log(`\n🎵 Top 5 Músicas Mais Tocadas:`)
      maisTocadas.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.titulo} - ${item.artista} (${item.vezesTocada}x)`)
      })
    }

    console.log(`\n✨ Dados criados! Agora você pode ver no dashboard web:`)
    console.log(`   → Histórico de reproduções`)
    console.log(`   → Músicas mais tocadas`)
    console.log(`   → Estatísticas gerais`)

    process.exit(0)
  } catch (error: any) {
    console.error("❌ Erro ao criar histórico:", error)
    if (error.message) {
      console.error(`   Detalhes: ${error.message}`)
    }
    process.exit(1)
  }
}

seedHistorico()
