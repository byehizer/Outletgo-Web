import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../hooks/useAuth';

import { cn } from '../lib/cn';

type HeaderProps = {
  onMenuOpen: () => void;
};

export function Header({ onMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 md:px-6',
      )}
    >
      <button
        type="button"
        className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] md:hidden"
        aria-label="Abrir menú de navegación"
        onClick={onMenuOpen}
      >
        <Menu className="size-6" />
      </button>

      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Panel OutletGo
        </p>
        <p className="truncate text-sm text-[var(--text-secondary)]">{user?.name ?? ''}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col truncate md:hidden">
        <span className="truncate text-xs text-[var(--text-muted)]">Sesión</span>
        <span className="truncate text-sm font-medium">{user?.email}</span>
      </div>

      <span className="hidden rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand md:inline-flex">
        {user?.role.toLowerCase()}
      </span>

      <button
        type="button"
        disabled={isLoggingOut}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]',
          isLoggingOut && 'cursor-not-allowed opacity-60',
        )}
        onClick={handleLogout}
      >
        <span className="hidden sm:inline">{isLoggingOut ? 'Saliendo…' : 'Salir'}</span>
        <LogOut className="size-4 shrink-0" aria-hidden />
      </button>
    </header>
  );
}
