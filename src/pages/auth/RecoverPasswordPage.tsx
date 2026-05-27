import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';

import { Mail } from 'lucide-react';

import { requestPasswordRecovery } from '../../features/auth/authApi';
import { recoverSchema, type RecoverFormValues } from '../../features/auth/recoverSchema';
import { resolvePostLoginRedirect } from '../../features/auth/postLoginRedirect';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { ForbiddenPage } from '../ForbiddenPage';

const BUYER_PANEL_MESSAGE = 'Este panel es solo para vendedores y administradores.';
const SUCCESS_MESSAGE =
  'Revisá tu correo (incluida la carpeta de spam). Si hay una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.';

export function RecoverPasswordPage() {
  const { isAuthenticated, user } = useAuth();
  const [hasSucceeded, setHasSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverFormValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: RecoverFormValues) => {
    try {
      await requestPasswordRecovery(data.email.trim());
    } catch {
      /* Misma respuesta visual ante cualquier resultado HTTP/red — prevención de enumeración (paso 9). */
    }
    setHasSucceeded(true);
  };

  if (isAuthenticated && user) {
    if (user.role === 'BUYER') {
      return <ForbiddenPage message={BUYER_PANEL_MESSAGE} />;
    }
    return <Navigate to={resolvePostLoginRedirect(user)} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand/15">
            <Mail className="size-7 text-brand" aria-hidden />
          </div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Recuperar contraseña</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Te enviaremos un enlace si hay una cuenta asociada a ese correo.
          </p>
        </div>

        {hasSucceeded ? (
          <div className="space-y-6">
            <p role="status" className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-3 text-sm text-[var(--text-primary)]">
              {SUCCESS_MESSAGE}
            </p>
            <Link
              className="flex h-10 w-full items-center justify-center rounded-lg bg-brand font-medium text-white transition-opacity hover:bg-brand-dark"
              to={ROUTES.login}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <label htmlFor="recover-email" className="text-xs font-medium text-[var(--text-secondary)]">
                Correo electrónico
              </label>
              <input
                id="recover-email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'recover-email-error' : undefined}
                className={cn(
                  'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                  errors.email ? 'border-danger' : 'border-[var(--border)]',
                )}
                placeholder="nombre@ejemplo.com"
                {...register('email')}
              />
              {errors.email ? (
                <p id="recover-email-error" role="alert" className="text-xs text-danger">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-brand font-medium text-white transition-opacity hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <Link
              className="block text-center text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
              to={ROUTES.login}
            >
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
