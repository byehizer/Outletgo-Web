import { Flag, Headphones, LayoutDashboard, MapPin, Shield, ShoppingCart, Star, UserCheck, Users } from 'lucide-react';

import { ROUTES } from '../../lib/constants';

import type { ShellNavItem } from './navTypes';

/** Panel admin — más ítems al implementar reportes. */
export const adminNavItems: ShellNavItem[] = [
  { to: ROUTES.adminRoot, label: 'Resumen', icon: LayoutDashboard },
  { to: ROUTES.adminProducts, label: 'Moderación', icon: Shield },
  { to: ROUTES.adminReviews, label: 'Reseñas', icon: Star },
  { to: ROUTES.adminReports, label: 'Reportes', icon: Flag },
  { to: ROUTES.adminOrders, label: 'Todos los Pedidos', icon: ShoppingCart },
  { to: ROUTES.adminPickupPoints, label: 'Puntos de Retiro', icon: MapPin },
  { to: ROUTES.adminSupport, label: 'Soporte', icon: Headphones },
  { to: ROUTES.adminSellers, label: 'Vendedores', icon: Users },
  { to: ROUTES.adminBuyers, label: 'Compradores', icon: UserCheck },
];
