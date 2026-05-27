import { type ReactNode, useState } from 'react';

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

  return (
    <div className="relative flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Cerrar overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar
        navItems={navItems}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuOpen={() => setMobileNavOpen(true)} />
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
