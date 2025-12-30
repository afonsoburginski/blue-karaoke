/**
 * Utilitários para geração e validação de chaves de ativação
 */

/**
 * Valida formato de chave de ativação
 */
export function validarFormatoChave(chave: string): boolean {
  const regex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  return regex.test(chave.toUpperCase())
}

/**
 * Normaliza chave (remove espaços, converte para maiúsculas)
 */
export function normalizarChave(chave: string): string {
  return chave.replace(/\s+/g, "").toUpperCase()
}

