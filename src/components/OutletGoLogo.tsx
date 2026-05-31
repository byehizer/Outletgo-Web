import { cn } from '../lib/cn';

export const OUTLETGO_BRAND = {
  logotype: {
    light: '/Logotipewhitemode.png',
    dark: '/Logotipeblackmode.png',
  },
  isotype: {
    light: '/Isotipewhitemode.png',
    dark: '/Isotipeblackmode.png',
  },
} as const;

/** @deprecated Use OUTLETGO_BRAND.logotype */
export const OUTLETGO_LOGO = OUTLETGO_BRAND.logotype;

type OutletGoLogoProps = {
  className?: string;
  /** Logotipo completo (auth, errores) o isotipo compacto (sidebar, favicon). */
  variant?: 'logotype' | 'isotype';
};

const DEFAULT_CLASSES = {
  logotype: 'h-8 w-auto max-w-[12rem] object-contain object-left',
  isotype: 'size-full object-contain object-center',
} as const;

/** Marca OutletGo responsive al tema del sistema (claro / oscuro). */
export function OutletGoLogo({ className, variant = 'logotype' }: OutletGoLogoProps) {
  const assets = OUTLETGO_BRAND[variant];

  const picture = (
    <picture className={variant === 'isotype' ? 'flex size-full items-center justify-center' : undefined}>
      <source srcSet={assets.dark} media="(prefers-color-scheme: dark)" />
      <img
        src={assets.light}
        alt="OutletGo"
        className={cn(DEFAULT_CLASSES[variant], variant === 'logotype' && className)}
        decoding="async"
      />
    </picture>
  );

  if (variant === 'isotype') {
    return (
      <span className={cn('inline-flex items-center justify-center', className ?? 'size-8')}>
        {picture}
      </span>
    );
  }

  return picture;
}
