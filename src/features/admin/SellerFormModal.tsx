import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ImageDropzone } from '../../components/ImageDropzone';
import { ApiError } from '../../lib/http/apiClient';
import { backendImageUploader } from '../../lib/uploads/backendImageUploader';
import { cn } from '../../lib/cn';

import type { SellerAccount } from '../../types/seller-account';

import { createSellerAccount, updateSellerAccount } from './sellersApi';

const cuitDigitsRefine = (raw: string) => raw.replace(/\D/g, '').length === 11;

const sellerFormBaseSchema = z.object({
  email: z.string().trim().email('Ingresá un email válido.'),
  businessName: z.string().trim().min(1, 'El nombre del negocio es obligatorio.'),
  cuit: z
    .string()
    .trim()
    .min(1, 'El CUIT es obligatorio.')
    .refine(cuitDigitsRefine, 'El CUIT debe tener exactamente 11 dígitos numéricos.'),
  address: z.string().trim().min(1, 'La dirección es obligatoria.'),
  description: z.string().trim().optional(),
});

const sellerCreateFormSchema = sellerFormBaseSchema.extend({
  temporaryPassword: z
    .string()
    .min(8, 'La contraseña temporal debe tener al menos 8 caracteres.'),
});

const sellerEditFormSchema = sellerFormBaseSchema.extend({
  logoUrl: z.string().nullable().optional(),
});

type SellerCreateFormValues = z.infer<typeof sellerCreateFormSchema>;
type SellerEditFormValues = z.infer<typeof sellerEditFormSchema>;

export type SellerFormModalProps =
  | {
      open: boolean;
      mode: 'create';
      onSuccess: () => void;
      onClose: () => void;
    }
  | {
      open: boolean;
      mode: 'edit';
      seller: SellerAccount;
      onSuccess: () => void;
      onClose: () => void;
    };

function newStagingSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `staging-${String(Date.now())}`;
}

function normalizeCuit(raw: string): string {
  return raw.replace(/\D/g, '');
}

function createDefaultValues(): SellerCreateFormValues {
  return {
    email: '',
    temporaryPassword: '',
    businessName: '',
    cuit: '',
    address: '',
    description: '',
  };
}

function editDefaultValues(seller: SellerAccount): SellerEditFormValues {
  return {
    email: seller.email,
    businessName: seller.store.businessName,
    cuit: seller.store.cuit,
    address: seller.store.address,
    description: seller.store.description,
    logoUrl: seller.store.logoUrl,
  };
}

const inputClass = (invalid: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
    invalid ? 'border-danger' : 'border-[var(--border)]',
  );

function editEmptyDefaultValues(): SellerEditFormValues {
  return {
    email: '',
    businessName: '',
    cuit: '',
    address: '',
    description: '',
    logoUrl: null,
  };
}

export function SellerFormModal(props: SellerFormModalProps) {
  const { open, mode, onSuccess, onClose } = props;
  const seller = mode === 'edit' ? props.seller : undefined;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [stagingSessionId, setStagingSessionId] = useState(newStagingSessionId);

  const isCreate = mode === 'create';
  const schema = isCreate ? sellerCreateFormSchema : sellerEditFormSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SellerCreateFormValues | SellerEditFormValues>({
    resolver: zodResolver(schema),
    defaultValues: isCreate
      ? createDefaultValues()
      : seller
        ? editDefaultValues(seller)
        : editEmptyDefaultValues(),
  });

  const logoPreview =
    mode === 'edit'
      ? (watch('logoUrl' as keyof SellerEditFormValues) as string | null | undefined)
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }
    setSubmitError(null);
    setShowPassword(false);
    setStagingSessionId(newStagingSessionId());
    if (isCreate) {
      reset(createDefaultValues());
    } else if (seller) {
      reset(editDefaultValues(seller));
    }
  }, [open, isCreate, seller, reset]);

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
      if (ev.key === 'Escape' && !isSubmitting) {
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
  }, [open, isSubmitting, onClose]);

  if (!open) {
    return null;
  }

  if (!isCreate && !seller) {
    return null;
  }

  const onSubmit = async (values: SellerCreateFormValues | SellerEditFormValues) => {
    setSubmitError(null);

    try {
      if (isCreate) {
        const v = values as SellerCreateFormValues;
        await createSellerAccount({
          email: v.email.trim(),
          temporaryPassword: v.temporaryPassword,
          businessName: v.businessName.trim(),
          cuit: normalizeCuit(v.cuit),
          address: v.address.trim(),
          description: v.description?.trim() || undefined,
        });
      } else if (seller) {
        const v = values as SellerEditFormValues;
        await updateSellerAccount(seller.id, {
          email: v.email.trim(),
          businessName: v.businessName.trim(),
          cuit: normalizeCuit(v.cuit),
          address: v.address.trim(),
          description: v.description?.trim() || undefined,
          logoUrl: v.logoUrl ?? null,
        });
      }
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo guardar el vendedor.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
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
        className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {isCreate ? 'Nuevo vendedor' : 'Editar vendedor'}
        </h2>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label htmlFor="seller-form-email" className="text-xs font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <input
              id="seller-form-email"
              type="email"
              autoComplete="off"
              className={inputClass(Boolean(errors.email))}
              {...register('email')}
            />
            {errors.email ? (
              <p role="alert" className="text-xs text-danger">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          {isCreate ? (
            <div className="space-y-2">
              <label
                htmlFor="seller-form-password"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Contraseña temporal
              </label>
              <div className="relative">
                <input
                  id="seller-form-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    inputClass(
                      isCreate &&
                        'temporaryPassword' in errors &&
                        Boolean(errors.temporaryPassword),
                    ),
                    'pr-10',
                  )}
                  {...register('temporaryPassword')}
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
              {isCreate && 'temporaryPassword' in errors && errors.temporaryPassword ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.temporaryPassword.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="seller-form-business"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Nombre del negocio
            </label>
            <input
              id="seller-form-business"
              type="text"
              className={inputClass(Boolean(errors.businessName))}
              {...register('businessName')}
            />
            {errors.businessName ? (
              <p role="alert" className="text-xs text-danger">
                {errors.businessName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="seller-form-cuit" className="text-xs font-medium text-[var(--text-secondary)]">
              CUIT
            </label>
            <input
              id="seller-form-cuit"
              type="text"
              inputMode="numeric"
              className={inputClass(Boolean(errors.cuit))}
              {...register('cuit')}
            />
            {errors.cuit ? (
              <p role="alert" className="text-xs text-danger">
                {errors.cuit.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="seller-form-address" className="text-xs font-medium text-[var(--text-secondary)]">
              Dirección
            </label>
            <input
              id="seller-form-address"
              type="text"
              className={inputClass(Boolean(errors.address))}
              {...register('address')}
            />
            {errors.address ? (
              <p role="alert" className="text-xs text-danger">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="seller-form-description"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Descripción <span className="text-[var(--text-muted)]">(opcional)</span>
            </label>
            <textarea
              id="seller-form-description"
              rows={3}
              className={cn(
                'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
              )}
              {...register('description')}
            />
          </div>

          {!isCreate ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Logo de la tienda <span className="text-[var(--text-muted)]">(opcional)</span>
              </p>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="size-16 rounded-lg border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]" aria-hidden>
                    Sin logo
                  </div>
                )}
                <div className="flex-1">
                  <ImageDropzone
                    uploader={backendImageUploader}
                    maxFiles={1}
                    stagingSessionId={stagingSessionId}
                    onUrlsChange={(urls) => {
                      setValue('logoUrl', urls[0] ?? null, { shouldDirty: true });
                    }}
                    disabled={isSubmitting}
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {isCreate ? (
            <p className="text-xs text-[var(--text-muted)]">
              El vendedor deberá completar su perfil al iniciar sesión por primera vez.
            </p>
          ) : null}

          {submitError ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!isSubmitting) {
                  onClose();
                }
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white outline-none transition hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
