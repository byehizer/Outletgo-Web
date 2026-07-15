import { Flag, Headphones, LayoutDashboard, MapPin, Percent, Shield, ShoppingCart, Star, UserCheck, Users, Image } from 'lucide-react';

import { ROUTES } from '../../lib/constants';

import type { ShellNavItem } from './navTypes';

/** Panel admin — más ítems al implementar reportes. */
export const adminNavItems: ShellNavItem[] = [
  { to: ROUTES.adminRoot, label: 'Resumen', icon: LayoutDashboard },
  { to: '/admin/banners', label: 'Banners y Campañas', icon: Image },
  { to: ROUTES.adminProducts, label: 'Moderación', icon: Shield },
  { to: ROUTES.adminReviews, label: 'Reseñas', icon: Star },
  { to: ROUTES.adminReports, label: 'Reportes', icon: Flag },
  { to: ROUTES.adminOrders, label: 'Todos los Pedidos', icon: ShoppingCart },
  { to: ROUTES.adminPickupPoints, label: 'Puntos de Retiro', icon: MapPin },
  { to: ROUTES.adminServiceFeeRules, label: 'Tarifas y Comisiones', icon: Percent },
  { to: ROUTES.adminSupport, label: 'Soporte', icon: Headphones },
  { to: ROUTES.adminSellers, label: 'Vendedores', icon: Users },
  { to: ROUTES.adminBuyers, label: 'Compradores', icon: UserCheck },
];
