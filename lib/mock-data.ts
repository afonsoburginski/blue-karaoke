export interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export interface Historico {
  id: number
  codigo: string
  data_execucao: string
  nota: number
}

// In-memory data store
export const musicas: Musica[] = [
  {
    codigo: "04920",
    artista: "Roberto Carlos",
    titulo: "Emoções",
    arquivo: "https://www.youtube.com/embed/jBFxAb_QnpY",
  },
  {
    codigo: "12345",
    artista: "Chitãozinho & Xororó",
    titulo: "Evidências",
    arquivo: "https://www.youtube.com/embed/ePrdmW76Sj0",
  },
  {
    codigo: "67890",
    artista: "Marília Mendonça",
    titulo: "Infiel",
    arquivo: "https://www.youtube.com/embed/kHxsPxKvsgE",
  },
  {
    codigo: "11111",
    artista: "Zezé Di Camargo & Luciano",
    titulo: "É o Amor",
    arquivo: "https://www.youtube.com/embed/8cXjYP2W_R4",
  },
  {
    codigo: "22222",
    artista: "Leonardo",
    titulo: "Cerveja",
    arquivo: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    codigo: "33333",
    artista: "Luan Santana",
    titulo: "Meteoro",
    arquivo: "https://www.youtube.com/embed/DCfFB7f9sKc",
  },
  {
    codigo: "44444",
    artista: "Jorge & Mateus",
    titulo: "Amo Noite e Dia",
    arquivo: "https://www.youtube.com/embed/5Wrg3l_W7q8",
  },
  {
    codigo: "55555",
    artista: "Gusttavo Lima",
    titulo: "Balada",
    arquivo: "https://www.youtube.com/embed/505gLfBYwSE",
  },
]

export const historico: Historico[] = []

let historicoIdCounter = 1

// Helper functions
export function getMusicaByCodigo(codigo: string): Musica | undefined {
  return musicas.find((m) => m.codigo === codigo)
}

export function salvarHistorico(codigo: string, nota: number): Historico {
  const novoHistorico: Historico = {
    id: historicoIdCounter++,
    codigo,
    data_execucao: new Date().toISOString(),
    nota,
  }
  historico.push(novoHistorico)
  return novoHistorico
}

export function getHistorico(): Historico[] {
  return historico.sort((a, b) => new Date(b.data_execucao).getTime() - new Date(a.data_execucao).getTime())
}
