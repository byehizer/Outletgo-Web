import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../lib/constants';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import type { Role } from '../types/role';

type RoleGateProps = {
  /** Roles que pueden ver las rutas hijas (SELLER o ADMIN según zona). */
  allow: readonly Role[];
};

/**
 * Comprueba `user.role` después de `ProtectedRoute`.
 * Si el rol no está permitido (p. ej. BUYER), muestra 403 con mensaje del briefing.
 */
export function RoleGate({ allow }: RoleGateProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (!allow.includes(user.role)) {
    return (
      <ForbiddenPage
        message={
          user.role === 'BUYER'
            ? 'Este panel es solo para vendedores y administradores.'
            : 'No tenés permiso para acceder a esta sección.'
        }
      />
    );
  }

  return <Outlet />;
}
