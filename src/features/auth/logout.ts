import { apiClient } from '../../lib/http/apiClient';

/**
 * Invalida sesión en backend antes de borrar tokens locales (paso 10).
 * Fallos de red / 401 se ignoran; la sesión local se limpia igual.
 */
export async function requestLogoutBestEffort(): Promise<void> {
  try {
    await apiClient.post<unknown>('/api/auth/logout');
  } catch {
    /* noop */
  }
}
