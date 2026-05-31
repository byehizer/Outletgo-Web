import { Link } from 'react-router-dom';

import { OutletGoLogo } from '../components/OutletGoLogo';
import { ROUTES } from '../lib/constants';

type ForbiddenPageProps = {
  /** Mensaje principal; el de BUYER viene del briefing. */
  message?: string;
};

const DEFAULT_MESSAGE = 'No tenés permiso para acceder a esta sección.';

export function ForbiddenPage({ message = DEFAULT_MESSAGE }: ForbiddenPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-base)] p-6 text-center">
      <OutletGoLogo className="h-10" />
      <p className="text-4xl font-bold text-[var(--text-muted)]">403</p>
      <p className="max-w-md text-sm text-[var(--text-secondary)]">{message}</p>
      <Link
        className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        to={ROUTES.login}
      >
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
