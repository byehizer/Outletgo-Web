import { Link } from 'react-router-dom';

import { OutletGoLogo } from '../components/OutletGoLogo';
import { ROUTES } from '../lib/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-base)] p-6 text-center">
      <OutletGoLogo className="h-10" />
      <p className="text-4xl font-bold text-[var(--text-muted)]">404</p>
      <p className="text-sm text-[var(--text-secondary)]">La página no existe.</p>
      <Link
        className="text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
        to={ROUTES.login}
      >
        Ir al login
      </Link>
    </div>
  );
}
