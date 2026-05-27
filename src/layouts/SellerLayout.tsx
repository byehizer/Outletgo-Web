import { Outlet } from 'react-router-dom';

import { AppShell } from './AppShell';
import { sellerNavItems } from './nav/sellerNav';

/** Layout persistente para rutas SELLER bajo `/seller`. */
export function SellerLayout() {
  return (
    <AppShell navItems={sellerNavItems}>
      <Outlet />
    </AppShell>
  );
}
