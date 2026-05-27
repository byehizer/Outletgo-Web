import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Zap } from 'lucide-react';

import { loginWithEmailPassword } from '../../features/auth/authApi';
import { startGoogleOAuth } from '../../features/auth/googleAuth';
import { loginSchema, type LoginFormValues } from '../../features/auth/loginSchema';
import {
  getPanelLoginBlockReason,
  resolvePostLoginRedirect,
} from '../../features/auth/postLoginRedirect';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http/apiClient';
import { ForbiddenPage } from '../ForbiddenPage';

const BUYER_PANEL_MESSAGE = 'Este panel es solo para vendedores y administradores.';

type LoginLocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleOAuthLoading, setGoogleOAuthLoading] = useState(false);

  const attemptedPath =
    (location.state as LoginLocationState | null)?.from?.pathname ?? undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);

    try {
      const response = await loginWithEmailPassword(data.email.trim(), data.password);

      const block = getPanelLoginBlockReason(response.user);
      if (block === 'buyer') {
        setFormError(BUYER_PANEL_MESSAGE);
        return;
      }
      if (block === 'inactive') {
        setFormError('Tu cuenta está desactivada. Contactá al administrador.');
        return;
      }

      login(response.token, response.user);

      const target = resolvePostLoginRedirect(response.user, attemptedPath);
      navigate(target, { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('No se pudo iniciar sesión. Intentá de nuevo.');
      }
    }
  };

  const onGoogleClick = async () => {
    setFormError(null);
    setGoogleOAuthLoading(true);
    try {
      await startGoogleOAuth();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('No se pudo abrir Google. Intentá de nuevo.');
      }
      setGoogleOAuthLoading(false);
    }
  };

  if (isAuthenticated && user) {
    if (user.role === 'BUYER') {
      return <ForbiddenPage message={BUYER_PANEL_MESSAGE} />;
    }
    return (
      <Navigate to={resolvePostLoginRedirect(user, attemptedPath)} replace />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand/15">
            <Zap className="size-7 text-brand" aria-hidden />
          </div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">OutletGo</h1>
          <p className="text-sm text-[var(--text-muted)]">Acceso al panel de vendedores y administración</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {formError}
            </p>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="login-email" className="text-xs font-medium text-[var(--text-secondary)]">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={cn(
                'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                errors.email ? 'border-danger' : 'border-[var(--border)]',
              )}
              placeholder="nombre@ejemplo.com"
              {...register('email')}
            />
            {errors.email ? (
              <p id="login-email-error" role="alert" className="text-xs text-danger">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-xs font-medium text-[var(--text-secondary)]">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={cn(
                'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                errors.password ? 'border-danger' : 'border-[var(--border)]',
              )}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password ? (
              <p id="login-password-error" role="alert" className="text-xs text-danger">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-brand font-medium text-white transition-opacity hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          disabled={isSubmitting || isGoogleOAuthLoading}
          aria-busy={isGoogleOAuthLoading}
          className={cn(
            'mt-4 flex h-10 w-full items-center justify-center rounded-lg border border-[var(--border)] text-sm font-medium transition-colors',
            isSubmitting || isGoogleOAuthLoading
              ? 'cursor-not-allowed opacity-60'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-input)]',
          )}
          onClick={onGoogleClick}
        >
          {isGoogleOAuthLoading ? 'Abriendo Google…' : 'Continuar con Google'}
        </button>

        <Link
          className="mt-6 block text-center text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
          to={ROUTES.recover}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
}
