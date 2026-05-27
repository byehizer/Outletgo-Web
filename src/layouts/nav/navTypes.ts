import type { LucideIcon } from 'lucide-react';

export type ShellNavItem = {
  /** Ruta react-router (`/seller`, `/seller/products`). */
  to: string;
  /** Texto visible. */
  label: string;
  icon: LucideIcon;
};
