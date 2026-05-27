import { Headphones, LayoutDashboard, MessageCircle, Package, ShoppingBag, Star, Store } from 'lucide-react';

import { ROUTES } from '../../lib/constants';

import type { ShellNavItem } from './navTypes';

/** Navegación del vendedor (se amplía en pasos de productos, pedidos, chat). */
export const sellerNavItems: ShellNavItem[] = [
  { to: ROUTES.sellerRoot, label: 'Resumen', icon: LayoutDashboard },
  { to: ROUTES.sellerProducts, label: 'Productos', icon: Package },
  { to: ROUTES.sellerOrders, label: 'Pedidos', icon: ShoppingBag },
  { to: ROUTES.sellerChats, label: 'Mensajes', icon: MessageCircle },
  { to: ROUTES.sellerSupport, label: 'Soporte', icon: Headphones },
  { to: ROUTES.sellerStore, label: 'Mi tienda', icon: Store },
  { to: ROUTES.sellerReviews, label: 'Reseñas', icon: Star },
];
