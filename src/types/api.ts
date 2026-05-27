/**
 * Respuesta paginada estilo Spring (supuesto del plan).
 */
export type Page<T> = {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
};

/**
 * Cuerpo típico de error del backend (supuesto del plan).
 */
export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

/**
 * Extrae un mensaje legible desde JSON parseado o devuelve un fallback.
 */
export function messageFromApiBody(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    return 'Ocurrió un error inesperado.';
  }
  const root = payload as Record<string, unknown>;
  if (typeof root.message === 'string' && root.message.length > 0) {
    return root.message;
  }
  const errorBlock = root.error;
  if (typeof errorBlock === 'object' && errorBlock !== null) {
    const err = errorBlock as Record<string, unknown>;
    if (typeof err.message === 'string' && err.message.length > 0) {
      return err.message;
    }
  }
  return 'Ocurrió un error inesperado.';
}
