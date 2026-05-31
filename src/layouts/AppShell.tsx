import { type ReactNode, useCallback, useEffect, useState } from 'react';

import type { ShellNavItem } from './nav/navTypes';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

type AppShellProps = {
  navItems: readonly ShellNavItem[];
  children: ReactNode;
};

/** Contenedor sidebar + header + zona de página (design system del proyecto). */
export function AppShell({ navItems, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const openMobileNav = useCallback(() => {
    setMobileNavOpen(true);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileNav();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {mobileNavOpen ?
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={closeMobileNav}
        />
      : null}

      <Sidebar
        navItems={navItems}
        mobileOpen={mobileNavOpen}
        onCloseMobile={closeMobileNav}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header navItems={navItems} onMenuOpen={openMobileNav} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
