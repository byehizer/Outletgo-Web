import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../lib/constants';
import { ForbiddenPage } from '../pages/ForbiddenPage';

/**
 * Raíz `/`: manda al login o al panel que corresponda según rol.
 */
export function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to={ROUTES.adminRoot} replace />;
  }

  if (user.role === 'SELLER') {
    return <Navigate to={ROUTES.sellerRoot} replace />;
  }

  return (
    <ForbiddenPage message="Este panel es solo para vendedores y administradores." />
  );
}
