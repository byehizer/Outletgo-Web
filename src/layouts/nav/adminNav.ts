import { LayoutDashboard, Users } from 'lucide-react';

import { ROUTES } from '../../lib/constants';

import type { ShellNavItem } from './navTypes';

/** Panel admin — más ítems al implementar moderación / reportes. */
export const adminNavItems: ShellNavItem[] = [
  { to: ROUTES.adminRoot, label: 'Resumen', icon: LayoutDashboard },
  { to: ROUTES.adminSellers, label: 'Vendedores', icon: Users },
];
