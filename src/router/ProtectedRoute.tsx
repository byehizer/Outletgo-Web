import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../lib/constants';

/**
 * Exige sesión válida (`isAuthenticated`). Si no hay sesión, manda al login
 * guardando la URL intentada para un posible “volver” después del login (Paso 7).
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
