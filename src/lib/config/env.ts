type AppEnvironment = 'development' | 'production';

export type EnvConfig = {
  readonly API_BASE_URL: string;
  readonly ENVIRONMENT: AppEnvironment;
};

const DEV_FALLBACK_API_BASE_URL = 'http://localhost:8080';

function readRawBackendUrl(): string | undefined {
  const value = import.meta.env.VITE_BACKEND_URL;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireProductionBackendUrl(): string {
  const url = readRawBackendUrl();
  if (url != null) {
    return url;
  }

  throw new Error(
    [
      'Configuración incompleta para producción.',
      'Definí la variable VITE_BACKEND_URL en el panel de Vercel',
      '(Settings → Environment Variables) con la URL base del backend Spring Boot.',
      'Ejemplo: https://api.outletgo.com',
    ].join(' '),
  );
}

function resolveApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return requireProductionBackendUrl();
  }

  return readRawBackendUrl() ?? DEV_FALLBACK_API_BASE_URL;
}

export const ENV: EnvConfig = {
  API_BASE_URL: resolveApiBaseUrl(),
  ENVIRONMENT: import.meta.env.PROD ? 'production' : 'development',
};

/** Valida variables críticas antes de montar la aplicación. */
export function validateEnv(): void {
  if (!import.meta.env.PROD) {
    return;
  }

  requireProductionBackendUrl();
}
