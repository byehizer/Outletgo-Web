import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Fecha ISO 8601 del backend → dd/MM/yyyy (locale es, coherente con Argentina).
 */
export function formatDate(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) {
    return '—';
  }
  return format(date, 'dd/MM/yyyy', { locale: es });
}

/**
 * Montos en pesos argentinos (ARS).
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
