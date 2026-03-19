/**
 * Normaliza un nombre de usuario eliminando espacios y convirtiendo a minúsculas.
 * Se usa en login, registro y recuperación de contraseña para garantizar consistencia.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}
