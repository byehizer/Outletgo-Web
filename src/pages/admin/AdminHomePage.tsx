import { useAuth } from '../../hooks/useAuth';

/**
 * Inicio admin dentro del shell.
 */
export function AdminHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Resumen administrador</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sesión: <span className="font-medium text-[var(--text-secondary)]">{user?.email ?? '…'}</span>
        </p>
      </header>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Estado del panel
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Desde el menú lateral accedés a cada módulo. Las pantallas marcadas como “próximo paso”
          se habilitarán cuando implementemos esa parte del plan.
        </p>
      </section>
    </div>
  );
}
