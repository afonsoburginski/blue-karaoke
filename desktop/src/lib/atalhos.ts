// Definições e utilitários do sistema de atalhos personalizáveis.

export interface AtalhoDefinicao {
  id: string
  acao: string
  descricao: string
  teclaDefault: string
  fixo?: boolean // não pode ser alterado pelo usuário
}

/** Todos os atalhos do sistema. Os fixos são exibidos como referência, não editáveis. */
export const ATALHOS: AtalhoDefinicao[] = [
  // ---------- Configuráveis ----------
  {
    id: "fechar",
    acao: "Fechar programa",
    descricao: "Encerra o app (telas inicial e de reprodução)",
    teclaDefault: "Escape",
  },
  {
    id: "minimizar",
    acao: "Minimizar programa",
    descricao: "Minimiza o app para a barra de tarefas",
    teclaDefault: " ",
  },
  {
    id: "sincronizar",
    acao: "Sincronizar músicas",
    descricao: "Baixa / sincroniza músicas (tela inicial)",
    teclaDefault: "*",
  },
  {
    id: "aleatorio",
    acao: "Tocar música aleatória",
    descricao: "Escolhe e toca uma música aleatória do catálogo",
    teclaDefault: "c",
  },
  {
    id: "pausar",
    acao: "Pausar reprodução / downloads",
    descricao: "Pausa o vídeo (tela de reprodução) ou downloads em andamento (tela inicial)",
    teclaDefault: "p",
  },
  {
    id: "reiniciar",
    acao: "Reiniciar / Voltar ao início",
    descricao: "Reinicia a música atual do início; na tela inicial, volta ao estado padrão",
    teclaDefault: "+",
  },
  {
    id: "cancelar",
    acao: "Cancelar / Sair da música",
    descricao: "Para a música e volta à tela inicial",
    teclaDefault: "Delete",
  },
  // ---------- Fixos (somente leitura) ----------
  {
    id: "configuracoes",
    acao: "Abrir configurações",
    descricao: "Abre este painel de configurações",
    teclaDefault: "F12",
    fixo: true,
  },
  {
    id: "tocar",
    acao: "Tocar música (confirmar código)",
    descricao: "Inicia a reprodução do código digitado",
    teclaDefault: "Enter",
    fixo: true,
  },
  {
    id: "apagar",
    acao: "Apagar dígito",
    descricao: "Remove o último caractere do código digitado",
    teclaDefault: "Backspace",
    fixo: true,
  },
  {
    id: "digitos",
    acao: "Digitar código (0–9)",
    descricao: "Insere dígitos para buscar músicas por código",
    teclaDefault: "0–9",
    fixo: true,
  },
]

export const ATALHOS_CONFIGURÁVEIS = ATALHOS.filter((a) => !a.fixo)
export const ATALHOS_FIXOS = ATALHOS.filter((a) => a.fixo)

/** Teclas que NUNCA podem ser usadas como atalho personalizado (reservadas pelo sistema). */
export const TECLAS_RESERVADAS = new Set([
  "F12", "Enter", "Backspace", "Tab",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
])

/** Formata uma tecla para exibição amigável. */
export function formatarTecla(key: string): string {
  const mapa: Record<string, string> = {
    " ": "Espaço",
    "Escape": "Esc",
    "Delete": "Delete",
    "Backspace": "Backspace",
    "Enter": "Enter",
    "Tab": "Tab",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    // Teclas numpad armazenadas por código
    "NumpadDecimal": "Del (Num)",
    "NumpadEnter": "Enter (Num)",
    "NumpadMultiply": "* (Num)",
    "NumpadAdd": "+ (Num)",
    "NumpadSubtract": "- (Num)",
    "NumpadDivide": "/ (Num)",
    "*": "*",
    "+": "+",
    "-": "-",
    "/": "/",
    ".": ".",
    ",": ",",
  }
  if (mapa[key] !== undefined) return mapa[key]
  if (key.startsWith("F") && !isNaN(Number(key.slice(1))) && key.length <= 3) return key
  if (key.length === 1) return key.toUpperCase()
  return key
}

/**
 * Códigos de teclas numpad que devem ser identificados pelo e.code
 * (pois e.key varia conforme o locale do teclado, ex: "," ou "." para NumpadDecimal).
 */
const CODE_BASED_KEYS = new Set([
  "NumpadDecimal",
  "NumpadEnter",
  "NumpadMultiply",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadDivide",
  "NumpadEqual",
])

/**
 * Verifica se um KeyboardEvent corresponde ao atalho configurado.
 * - Chaves armazenadas como "NumpadDecimal" etc. são comparadas por e.code (independente de locale).
 * - Letras são case-insensitive.
 * - "*" captura NumpadMultiply também.
 */
export function matchKey(e: KeyboardEvent, key: string): boolean {
  // Teclas numpad identificadas por código (locale-independent)
  if (CODE_BASED_KEYS.has(key)) {
    return e.code === key
  }
  // Case-insensitive para letras
  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    return e.key.toLowerCase() === key.toLowerCase()
  }
  // Asterisco: numpad e teclado normal
  if (key === "*") {
    return e.key === "*" || e.key === "Multiply" || e.code === "NumpadMultiply"
  }
  // Espaço
  if (key === " ") {
    return e.key === " "
  }
  return e.key === key
}

/**
 * Converte um KeyboardEvent para a representação interna da tecla.
 * Teclas numpad são armazenadas pelo código (e.code) para ser locale-independent.
 */
export function keyFromEvent(e: KeyboardEvent): string {
  if (CODE_BASED_KEYS.has(e.code)) return e.code
  return e.key
}
