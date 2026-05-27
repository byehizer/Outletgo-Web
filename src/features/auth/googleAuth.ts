import { apiClient } from '../../lib/http/apiClient';

type GoogleInitPayload = Record<string, unknown>;

function resolveOAuthRedirectUrl(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const data = payload as GoogleInitPayload;
  const candidate = data.url ?? data.oauthUrl ?? data.oauth_url;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}

/**
 * Obtiene la URL de autorización Google y navega fuera del SPA (Paso 8).
 */
export async function startGoogleOAuth(): Promise<void> {
  const body = await apiClient.get<unknown>('/api/auth/google/init', { skipAuth: true });
  const url = resolveOAuthRedirectUrl(body);
  if (!url) {
    throw new Error('Respuesta inválida del servidor al iniciar Google.');
  }
  window.location.assign(url);
}
