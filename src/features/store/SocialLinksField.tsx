import { useFormContext } from 'react-hook-form';

import { cn } from '../../lib/cn';

import type { StoreProfileFormValues } from './storeSchema';

type SocialRowProps = {
  id: string;
  name: keyof StoreProfileFormValues['social'];
  label: string;
  placeholder: string;
};

const rows: SocialRowProps[] = [
  { id: 'store-social-instagram', name: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { id: 'store-social-facebook', name: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { id: 'store-social-tiktok', name: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
  { id: 'store-social-website', name: 'website', label: 'Sitio web', placeholder: 'https://…' },
];

/**
 * Redes opcionales del perfil de tienda (Paso 16).
 */
export function SocialLinksField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<StoreProfileFormValues>();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-[var(--text-primary)]">Redes y presencia online</legend>
      <p className="text-xs text-[var(--text-muted)]">Opcional. Sólo URLs públicas (https).</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => {
          const err = errors.social?.[row.name]?.message;
          return (
            <div key={row.name} className="space-y-1.5">
              <label htmlFor={row.id} className="text-xs font-medium text-[var(--text-secondary)]">
                {row.label}
              </label>
              <input
                id={row.id}
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder={row.placeholder}
                className={cn(
                  'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                  err ? 'border-danger' : 'border-[var(--border)]',
                )}
                {...register(`social.${row.name}`)}
              />
              {err ?
                <p role="alert" className="text-xs text-danger">
                  {err}
                </p>
              : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
