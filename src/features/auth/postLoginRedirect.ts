import { ROUTES } from '../../lib/constants';

import type { User } from '../../types/user';

/** Motivos para no iniciar sesión en el panel (login email/OAuth). */
export type PanelLoginBlockReason = 'buyer' | 'inactive';

/**
 * BUYER / inactivos: mismo criterio en login por email y callback OAuth (briefing plan).
 */
export function getPanelLoginBlockReason(user: User): PanelLoginBlockReason | undefined {
  if (user.role === 'BUYER') {
    return 'buyer';
  }
  if (!user.isActive) {
    return 'inactive';
  }
  return undefined;
}

/**
 * Destino después del login: respeta la URL guardada por ProtectedRoute si el rol coincide.
 */
export function resolvePostLoginRedirect(user: User, attemptedPath?: string): string {
  if (user.role === 'ADMIN') {
    if (attemptedPath?.startsWith(ROUTES.adminRoot)) {
      return attemptedPath;
    }
    return ROUTES.adminRoot;
  }

  if (user.role === 'SELLER') {
    if (attemptedPath?.startsWith(ROUTES.sellerRoot)) {
      return attemptedPath;
    }
    return ROUTES.sellerRoot;
  }

  return ROUTES.login;
}
