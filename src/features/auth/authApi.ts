import { apiClient } from '../../lib/http/apiClient';

import type { User } from '../../types/user';

/** Respuesta esperada del backend tras login exitoso (briefing). */
export type LoginResponse = {
  token: string;
  user: User;
};

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    '/api/auth/login',
    { email, password },
    { skipAuth: true },
  );
}

/** Perfil actual; en OAuth callback se llama antes de persistir sesión usando el JWT devuelto en la URL. */
export async function fetchCurrentUser(accessToken: string): Promise<User> {
  return apiClient.get<User>('/api/auth/me', { bearerToken: accessToken });
}

/** Solicitud de recuperación; la UI siempre muestra éxito neutro para no revelar si el correo existe (plan paso 9). */
export async function requestPasswordRecovery(email: string): Promise<void> {
  await apiClient.post<unknown>(
    '/api/auth/recover-password',
    { email },
    { skipAuth: true },
  );
}
