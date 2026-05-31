import { NavLink } from 'react-router-dom';
import { X, Zap } from 'lucide-react';

import { cn } from '../lib/cn';
import { ROUTES } from '../lib/constants';

import type { ShellNavItem } from './nav/navTypes';

type SidebarProps = {
  navItems: readonly ShellNavItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ navItems, mobileOpen, onCloseMobile }: SidebarProps) {
  const mobilePanelClasses = cn(
    'fixed inset-y-0 left-0 z-50 flex w-[min(100vw,var(--sidebar-width))] max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:max-w-none md:translate-x-0',
    mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:shadow-none',
  );

  return (
    <aside className={mobilePanelClasses} aria-label="Navegación principal">
      <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="size-7 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="font-display truncate text-sm font-semibold tracking-tight">OutletGo</p>
            <p className="truncate text-xs text-[var(--text-muted)]">Panel</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] md:hidden"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Secciones del panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.sellerRoot || item.to === ROUTES.adminRoot}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-l-2 border-brand bg-brand/10 text-[var(--text-primary)]'
                    : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )
              }
            >
              <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
