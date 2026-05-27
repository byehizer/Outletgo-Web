type ComingSoonPageProps = {
  title: string;
  description?: string;
};

/** Pantalla provisional para rutas enlazadas desde el sidebar antes de tener el módulo real. */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
      <h1 className="font-display text-display-sm text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
        {description ?? 'Este módulo está en el roadmap; lo implementamos en pasos posteriores.'}
      </p>
    </div>
  );
}
