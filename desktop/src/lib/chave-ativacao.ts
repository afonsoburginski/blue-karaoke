export function normalizarChave(chave: string): string {
  return chave.trim().toUpperCase().replace(/\s+/g, "-")
}

export function validarFormatoChave(chave: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(chave)
}
