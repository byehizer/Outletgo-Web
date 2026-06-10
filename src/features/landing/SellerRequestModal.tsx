import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, Loader2, Mail, Phone, User, X } from 'lucide-react';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import { submitSellerRegistrationRequest } from './landingApi';

const cuitRegex = /^(20|23|24|27|30|33|34)-?[0-9]{8}-?[0-9]$/;

const sellerRequestSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(3, 'El nombre comercial debe tener al menos 3 caracteres.'),
  cuit: z
    .string()
    .trim()
    .refine((v) => {
      const clean = v.replace(/\D/g, '');
      return clean.length === 11 && cuitRegex.test(v);
    }, 'Ingresá un CUIT válido (ej: 30-12345678-9).'),
  contactName: z
    .string()
    .trim()
    .min(3, 'El nombre de contacto debe tener al menos 3 caracteres.'),
  email: z
    .string()
    .trim()
    .email('Ingresá un correo electrónico válido.'),
  phone: z
    .string()
    .trim()
    .min(6, 'El teléfono debe tener al menos 6 caracteres.'),
  notes: z.string().trim().optional(),
});

type SellerRequestFormValues = z.infer<typeof sellerRequestSchema>;

export type SellerRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SellerRequestModal({ open, onClose }: SellerRequestModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SellerRequestFormValues>({
    resolver: zodResolver(sellerRequestSchema),
    defaultValues: {
      businessName: '',
      cuit: '',
      contactName: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset();
    setSubmitError(null);
    setIsSuccess(false);
  }, [open, reset]);

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

  const onSubmit = async (values: SellerRequestFormValues) => {
    setSubmitError(null);
    try {
      await submitSellerRegistrationRequest(values);
      setIsSuccess(true);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo enviar la solicitud. Intentá de nuevo.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
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
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none text-slate-800 relative overflow-hidden"
      >
        {/* Glow de fondo */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#2B8FD4]/5 rounded-full blur-[40px] pointer-events-none" />

        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal"
        >
          <X className="size-5" />
        </button>

        {!isSuccess ? (
          <>
            <header className="space-y-1">
              <div className="flex items-center gap-2">
                {/* ISOTIPO OFICIAL WHITE MODE */}
                <img src="/Isotipewhitemode.png" alt="OutletGo Isotype" className="w-7 h-7 object-contain" />
                <h2 id={titleId} className="font-display text-xl font-bold text-slate-900 tracking-tight">
                  Registrá tu Comercio
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Completá el formulario para que nuestro equipo configure la cuenta de tu local.
              </p>
            </header>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nombre de Comercio */}
                <div className="space-y-1.5">
                  <label htmlFor="b2b-business-name" className="text-xs font-semibold text-slate-600">
                    Nombre del Local / Comercio *
                  </label>
                  <input
                    id="b2b-business-name"
                    type="text"
                    placeholder="Ej: Outlet Avellaneda Sur"
                    className={cn(
                      'h-10 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white',
                      errors.businessName ? 'border-danger' : 'border-slate-200',
                    )}
                    {...register('businessName')}
                  />
                  {errors.businessName ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {errors.businessName.message}
                    </p>
                  ) : null}
                </div>

                {/* CUIT */}
                <div className="space-y-1.5">
                  <label htmlFor="b2b-cuit" className="text-xs font-semibold text-slate-600">
                    CUIT *
                  </label>
                  <input
                    id="b2b-cuit"
                    type="text"
                    placeholder="Ej: 30-12345678-9"
                    maxLength={13}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white',
                      errors.cuit ? 'border-danger' : 'border-slate-200',
                    )}
                    {...register('cuit')}
                  />
                  {errors.cuit ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {errors.cuit.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nombre del Contacto */}
                <div className="space-y-1.5">
                  <label htmlFor="b2b-contact-name" className="text-xs font-semibold text-slate-600">
                    Nombre del Contacto *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="b2b-contact-name"
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      className={cn(
                        'h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white',
                        errors.contactName ? 'border-danger' : 'border-slate-200',
                      )}
                      {...register('contactName')}
                    />
                  </div>
                  {errors.contactName ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {errors.contactName.message}
                    </p>
                  ) : null}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="b2b-email" className="text-xs font-semibold text-slate-600">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="b2b-email"
                      type="email"
                      placeholder="ejemplo@comercio.com"
                      className={cn(
                        'h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white',
                        errors.email ? 'border-danger' : 'border-slate-200',
                      )}
                      {...register('email')}
                    />
                  </div>
                  {errors.email ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <label htmlFor="b2b-phone" className="text-xs font-semibold text-slate-600">
                  Teléfono de Contacto / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="b2b-phone"
                    type="tel"
                    placeholder="Ej: 11 2345 6789"
                    className={cn(
                      'h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white',
                      errors.phone ? 'border-danger' : 'border-slate-200',
                    )}
                    {...register('phone')}
                  />
                </div>
                {errors.phone ? (
                  <p role="alert" className="text-[11px] text-danger">
                    {errors.phone.message}
                  </p>
                ) : null}
              </div>

              {/* Notas opcionales */}
              <div className="space-y-1.5">
                <label htmlFor="b2b-notes" className="text-xs font-semibold text-slate-600">
                  Comentarios Adicionales (Opcional)
                </label>
                <textarea
                  id="b2b-notes"
                  rows={3}
                  placeholder="Contanos qué marcas vendés o tus consultas..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2B8FD4] focus:bg-white"
                  {...register('notes')}
                />
              </div>

              {submitError ? (
                <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {submitError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-transparent px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2B8FD4] px-5 text-sm font-bold text-white transition hover:bg-[#2B8FD4]/90 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    'Enviar Solicitud'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-6 text-center space-y-4 animate-fadeIn">
            <div className="size-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">
                ¡Solicitud Recibida!
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Gracias por ponerte en contacto. Nuestro equipo comercial analizará los datos de tu comercio y te contactará a la brevedad para realizar el alta de tu tienda en OutletGo.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-800 transition shadow-lg"
                onClick={onClose}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
