import { apiClient } from '../../lib/http/apiClient';

import type { User } from '../../types/user';

/** Respuesta esperada del backend tras login exitoso (briefing). */
export type LoginResponse = {
  token: string;
  user: User;
};

function normalizeUser(rawUser: any): User {
  if (!rawUser) return rawUser;
  let mappedRole = rawUser.role;
  if (mappedRole === 'OUTLET_OWNER') {
    mappedRole = 'SELLER';
  } else if (mappedRole === 'CLIENT') {
    mappedRole = 'BUYER';
  }
  return {
    ...rawUser,
    role: mappedRole,
  };
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/api/auth/login',
    { email, password },
    { skipAuth: true },
  );
  return {
    token: response.token,
    user: normalizeUser(response.user),
  };
}

/** Perfil actual; en OAuth callback se llama antes de persistir sesión usando el JWT devuelto en la URL. */
export async function fetchCurrentUser(accessToken: string): Promise<User> {
  const user = await apiClient.get<any>('/api/auth/me', { bearerToken: accessToken });
  return normalizeUser(user);
}

/** Solicitud de recuperación; la UI siempre muestra éxito neutro para no revelar si el correo existe (plan paso 9). */
export async function requestPasswordRecovery(email: string): Promise<void> {
  await apiClient.post<unknown>(
    '/api/auth/recover-password',
    { email },
    { skipAuth: true },
  );
}
