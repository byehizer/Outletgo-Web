import { Outlet } from 'react-router-dom';

import { AppShell } from './AppShell';
import { adminNavItems } from './nav/adminNav';

/** Layout persistente para rutas ADMIN bajo `/admin`. */
export function AdminLayout() {
  return (
    <AppShell navItems={adminNavItems}>
      <Outlet />
    </AppShell>
  );
}
