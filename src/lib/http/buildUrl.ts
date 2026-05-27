/** Quita slash final para concatenar rutas sin duplicar `/`. */
function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Une `VITE_BACKEND_URL` con una ruta relativa (`/api/...`). La ruta va con `/api` cuando el backend use ese prefijo. */
export function resolveApiUrl(path: string): string {
  const rawBase = import.meta.env.VITE_BACKEND_URL;
  if (!rawBase || typeof rawBase !== 'string') {
    throw new Error(
      'Falta VITE_BACKEND_URL. Copiá .env.example a .env.local y definí la URL del backend.',
    );
  }
  const base = normalizeBase(rawBase.trim());
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
