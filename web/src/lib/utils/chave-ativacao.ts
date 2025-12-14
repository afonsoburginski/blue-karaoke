/**
 * Utilitários para geração e validação de chaves de ativação
 */
import crypto from "crypto"

/**
 * Gera uma chave de ativação única
 */
export function gerarChaveAtivacao(): string {
  // Formato: XXXX-XXXX-XXXX-XXXX (16 caracteres alfanuméricos)
  const parte1 = crypto.randomBytes(2).toString("hex").toUpperCase()
  const parte2 = crypto.randomBytes(2).toString("hex").toUpperCase()
  const parte3 = crypto.randomBytes(2).toString("hex").toUpperCase()
  const parte4 = crypto.randomBytes(2).toString("hex").toUpperCase()
  
  return `${parte1}-${parte2}-${parte3}-${parte4}`
}

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

