/**
 * Converte uma string em um slug (URL-friendly)
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, "") // Remove hífens no início e fim
}

/**
 * Extrai o nome do email (parte antes do @) e cria um slug
 */
export function createSlugFromEmail(email: string): string {
  const namePart = email.split("@")[0]
  return createSlug(namePart)
}

