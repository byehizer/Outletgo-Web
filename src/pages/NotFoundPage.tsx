import { Link } from 'react-router-dom';

import { ROUTES } from '../lib/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-white">
      <p className="text-4xl font-bold text-slate-500">404</p>
      <p className="text-sm text-slate-400">La página no existe.</p>
      <Link className="text-sky-400 underline" to={ROUTES.login}>
        Ir al login
      </Link>
    </div>
  );
}
