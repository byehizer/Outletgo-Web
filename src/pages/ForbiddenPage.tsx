import { Link } from 'react-router-dom';

import { ROUTES } from '../lib/constants';

type ForbiddenPageProps = {
  /** Mensaje principal; el de BUYER viene del briefing. */
  message?: string;
};

const DEFAULT_MESSAGE = 'No tenés permiso para acceder a esta sección.';

export function ForbiddenPage({ message = DEFAULT_MESSAGE }: ForbiddenPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white">
      <p className="text-4xl font-bold text-slate-500">403</p>
      <p className="max-w-md text-sm text-slate-300">{message}</p>
      <Link
        className="mt-2 rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        to={ROUTES.login}
      >
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
