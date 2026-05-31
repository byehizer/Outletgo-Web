import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';

import type { BuyerAccount } from '../../types/buyer-account';

import { resetBuyerPassword, updateBuyerEmail } from './buyersApi';

const emailFormSchema = z.object({
  email: z.string().trim().email('Ingresá un email válido.'),
});

const passwordFormSchema = z.object({
  temporaryPassword: z
    .string()
    .min(8, 'La contraseña temporal debe tener al menos 8 caracteres.'),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export type BuyerSupportModalProps = {
  open: boolean;
  buyer: BuyerAccount;
  onSuccess: (action: 'email' | 'password') => void;
  onClose: () => void;
};

const inputClass = (invalid: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
    invalid ? 'border-danger' : 'border-[var(--border)]',
  );

const secondaryBtnClass =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50';

export function BuyerSupportModal({
  open,
  buyer,
  onSuccess,
  onClose,
}: BuyerSupportModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [passwordFeedback, setPasswordFeedback] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: buyer.email },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { temporaryPassword: '' },
  });

  const emailSubmitting = emailForm.formState.isSubmitting;
  const passwordSubmitting = passwordForm.formState.isSubmitting;
  const busy = emailSubmitting || passwordSubmitting;

  useEffect(() => {
    if (!open) {
      return;
    }
    emailForm.reset({ email: buyer.email });
    passwordForm.reset({ temporaryPassword: '' });
    setShowPassword(false);
    setEmailFeedback(null);
    setPasswordFeedback(null);
  }, [open, buyer.id, buyer.email, emailForm, passwordForm]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    const first =
      root?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) ?? root;
    first?.focus({ preventScroll: true });

    const onDocKeyDown = (ev: globalThis.KeyboardEvent) => {
      if (!root) {
        return;
      }
      if (ev.key === 'Escape' && !busy) {
        ev.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onDocKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onDocKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, busy, onClose]);

  if (!open) {
    return null;
  }

  const onEmailSubmit = async (values: EmailFormValues) => {
    setEmailFeedback(null);
    try {
      const updated = await updateBuyerEmail(buyer.id, { email: values.email.trim() });
      emailForm.reset({ email: updated.email });
      setEmailFeedback({ kind: 'ok', text: 'Email actualizado correctamente' });
      onSuccess('email');
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setEmailFeedback({ kind: 'err', text: error.message });
      } else if (error instanceof Error) {
        setEmailFeedback({ kind: 'err', text: error.message });
      } else {
        setEmailFeedback({ kind: 'err', text: 'No se pudo actualizar el email.' });
      }
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordFeedback(null);
    try {
      await resetBuyerPassword(buyer.id, {
        temporaryPassword: values.temporaryPassword,
      });
      passwordForm.reset({ temporaryPassword: '' });
      setShowPassword(false);
      setPasswordFeedback({
        kind: 'ok',
        text: 'Contraseña reseteada. Comunicala al comprador por un canal seguro.',
      });
      onSuccess('password');
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setPasswordFeedback({ kind: 'err', text: error.message });
      } else if (error instanceof Error) {
        setPasswordFeedback({ kind: 'err', text: error.message });
      } else {
        setPasswordFeedback({ kind: 'err', text: 'No se pudo resetear la contraseña.' });
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[min(92vh,640px)] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Soporte — {buyer.email}
        </h2>

        <section className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cambiar email</h3>
          <form
            className="space-y-3"
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <label htmlFor="buyer-support-email" className="text-xs font-medium text-[var(--text-secondary)]">
                Nuevo email
              </label>
              <input
                id="buyer-support-email"
                type="email"
                autoComplete="off"
                className={inputClass(Boolean(emailForm.formState.errors.email))}
                {...emailForm.register('email')}
              />
              {emailForm.formState.errors.email ? (
                <p role="alert" className="text-xs text-danger">
                  {emailForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            {emailFeedback ? (
              <p
                role={emailFeedback.kind === 'err' ? 'alert' : 'status'}
                className={cn(
                  'text-sm',
                  emailFeedback.kind === 'ok' ? 'text-success' : 'text-danger',
                )}
              >
                {emailFeedback.text}
              </p>
            ) : null}

            <button type="submit" className={secondaryBtnClass} disabled={emailSubmitting}>
              {emailSubmitting ? 'Actualizando…' : 'Actualizar email'}
            </button>
          </form>
        </section>

        <hr className="my-6 border-[var(--border)]" />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resetear contraseña</h3>
          <form
            className="space-y-3"
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <label
                htmlFor="buyer-support-password"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Contraseña temporal
              </label>
              <div className="relative">
                <input
                  id="buyer-support-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Ingresá una contraseña temporal"
                  className={cn(
                    inputClass(Boolean(passwordForm.formState.errors.temporaryPassword)),
                    'pr-10',
                  )}
                  {...passwordForm.register('temporaryPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.temporaryPassword ? (
                <p role="alert" className="text-xs text-danger">
                  {passwordForm.formState.errors.temporaryPassword.message}
                </p>
              ) : null}
            </div>

            {passwordFeedback ? (
              <p
                role={passwordFeedback.kind === 'err' ? 'alert' : 'status'}
                className={cn(
                  'text-sm',
                  passwordFeedback.kind === 'ok' ? 'text-success' : 'text-danger',
                )}
              >
                {passwordFeedback.text}
              </p>
            ) : null}

            <button type="submit" className={secondaryBtnClass} disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Reseteando…' : 'Resetear contraseña'}
            </button>
          </form>
        </section>

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          El comprador deberá cambiar su contraseña al iniciar sesión.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (!busy) {
                onClose();
              }
            }}
            disabled={busy}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
