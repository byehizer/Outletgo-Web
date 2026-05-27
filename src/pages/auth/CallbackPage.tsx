import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fetchCurrentUser } from '../../features/auth/authApi';
import {
  getPanelLoginBlockReason,
  resolvePostLoginRedirect,
} from '../../features/auth/postLoginRedirect';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http/apiClient';
import { ForbiddenPage } from '../ForbiddenPage';

type CallbackUiState =
  | { status: 'loading' }
  | { status: 'forbidden_buyer' }
  | { status: 'inactive' }
  | { status: 'error'; message: string };

const BUYER_PANEL_MESSAGE = 'Este panel es solo para vendedores y administradores.';

/**
 * OAuth redirect: `/auth/callback?token=...` (plan). Quita la query sólo cuando el flujo terminó:
 * si se limpiaba antes, en dev Strict Mode ejecuta el efecto 2× y la 2ª corrida perdía `?token=`.
 */
export function CallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [uiState, setUiState] = useState<CallbackUiState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    /** Sincroniza barra/Router tras terminar sin `token` sensible (no antes: Strict Mode corre el efecto 2× en dev). */
    function stripOAuthQueryFromUrl(): void {
      if (!window.location.search) {
        return;
      }
      navigate(`${ROUTES.authCallback}`, { replace: true });
    }

    async function finishOAuthCallback() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('error');
      const oauthErrorDescription = params.get('error_description');
      const accessToken = params.get('token');

      if (oauthError) {
        const detail =
          oauthErrorDescription && oauthErrorDescription.length > 0
            ? decodeURIComponent(oauthErrorDescription.replace(/\+/g, ' '))
            : oauthError.replace(/_/g, ' ');
        stripOAuthQueryFromUrl();
        setUiState({
          status: 'error',
          message: detail.length > 0 ? detail : 'No se pudo completar el acceso con Google.',
        });
        return;
      }

      if (!accessToken) {
        stripOAuthQueryFromUrl();
        setUiState({
          status: 'error',
          message: 'El enlace de acceso es inválido o expiró.',
        });
        return;
      }

      try {
        const user = await fetchCurrentUser(accessToken);
        if (cancelled) {
          return;
        }

        const block = getPanelLoginBlockReason(user);
        if (block === 'buyer') {
          stripOAuthQueryFromUrl();
          setUiState({ status: 'forbidden_buyer' });
          return;
        }
        if (block === 'inactive') {
          stripOAuthQueryFromUrl();
          setUiState({ status: 'inactive' });
          return;
        }

        /** `navigate` al panel ya reemplaza la URL completa y deja de exponer `?token=`. */
        login(accessToken, user);
        navigate(resolvePostLoginRedirect(user), { replace: true });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        stripOAuthQueryFromUrl();
        if (error instanceof ApiError) {
          setUiState({ status: 'error', message: error.message });
        } else if (error instanceof Error) {
          setUiState({ status: 'error', message: error.message });
        } else {
          setUiState({
            status: 'error',
            message: 'No se pudo completar el acceso con Google. Intentá de nuevo.',
          });
        }
      }
    }

    void finishOAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [login, navigate]);

  if (uiState.status === 'forbidden_buyer') {
    return <ForbiddenPage message={BUYER_PANEL_MESSAGE} />;
  }

  if (uiState.status === 'inactive') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-lg">
          <p className="text-sm text-[var(--text-primary)]">
            Tu cuenta está desactivada. Contactá al administrador.
          </p>
          <Link
            className={cn(
              'mt-6 inline-block text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline',
            )}
            to={ROUTES.login}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  if (uiState.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
          <p role="alert" className="text-sm text-danger">
            {uiState.message}
          </p>
          <Link
            className="mt-6 block text-center text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
            to={ROUTES.login}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-[var(--text-muted)]">
        <output className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent motion-reduce:animate-none" />
        <p className="text-sm">Completando acceso…</p>
      </div>
    </div>
  );
}
