import { ENV } from '../config/env';

/** Quita slash final para concatenar rutas sin duplicar `/`. */
function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Une `ENV.API_BASE_URL` con una ruta relativa (`/api/...`). La ruta va con `/api` cuando el backend use ese prefijo. */
export function resolveApiUrl(path: string): string {
  const base = normalizeBase(ENV.API_BASE_URL);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
