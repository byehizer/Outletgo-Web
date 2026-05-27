/**
 * Handlers invocados cuando el backend responde 401 (token inválido o expirado).
 * En el Paso 4 AuthContext se suscribe para limpiar sesión y redirigir a /login.
 */
type UnauthorizedListener = () => void;

const listeners = new Set<UnauthorizedListener>();

/**
 * Registra un callback ante 401. Devuelve una función para darse de baja (cleanup en useEffect).
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Dispara todos los handlers (llamar solo desde apiClient ante 401). */
export function dispatchUnauthorized(): void {
  for (const fn of [...listeners]) {
    fn();
  }
}
