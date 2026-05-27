import { useAuth } from '../../hooks/useAuth';

/**
 * Inicio seller dentro del shell (métricas reales más adelante).
 */
export function SellerHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Resumen</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Conectado como{' '}
          <span className="font-medium text-[var(--text-secondary)]">{user?.email ?? '…'}</span>
        </p>
      </header>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Estado del panel
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
          <li>Layout y navegación (Paso 6) listos.</li>
          <li>Los KPIs de ventas / pedidos se agregan con el Paso 20.</li>
        </ul>
      </section>
    </div>
  );
}
