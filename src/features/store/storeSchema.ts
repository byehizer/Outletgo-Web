import { z } from 'zod';

/** Orden fijo: lunes → domingo (coincide con API y mock). */
export const STORE_WEEKDAYS_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type StoreWeekday = (typeof STORE_WEEKDAYS_ORDER)[number];

export const STORE_WEEKDAY_LABELS: Record<StoreWeekday, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** URL vacía OK; si hay texto, debe ser http(s) o blob: (subida local en DEV). */
const optionalPublicUrl = z
  .string()
  .trim()
  .refine(
    (v) =>
      v.length === 0 ||
      v.startsWith('blob:') ||
      /^https?:\/\/.+/i.test(v),
    'Debe ser una URL pública (https://…).',
  );

const cuitRefine = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 11;
};

const weekdayEnum = z.enum(STORE_WEEKDAYS_ORDER);

export const storeBusinessHoursDaySchema = z
  .object({
    day: weekdayEnum,
    isClosed: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  })
  .superRefine((row, ctx) => {
    if (row.isClosed) {
      return;
    }
    const open = row.openTime?.trim() ?? '';
    const close = row.closeTime?.trim() ?? '';
    if (!open) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá la hora de apertura.',
        path: ['openTime'],
      });
    } else if (!HH_MM.test(open)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usá formato HH:MM.',
        path: ['openTime'],
      });
    }
    if (!close) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá la hora de cierre.',
        path: ['closeTime'],
      });
    } else if (!HH_MM.test(close)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usá formato HH:MM.',
        path: ['closeTime'],
      });
    }
  });

export type StoreBusinessHoursDayForm = z.infer<typeof storeBusinessHoursDaySchema>;

export function createDefaultBusinessHours(): StoreBusinessHoursDayForm[] {
  return STORE_WEEKDAYS_ORDER.map((day) => ({
    day,
    isClosed: day === 'SUNDAY',
    openTime: day === 'SUNDAY' ? '' : '09:00',
    closeTime: day === 'SUNDAY' ? '' : '18:00',
  }));
}

export const storeProfileFormSchema = z
  .object({
    name: z.string().min(2, 'Indicá el nombre del local.'),
    taxIdCuit: z
      .string()
      .min(1, 'El CUIT es obligatorio.')
      .refine(cuitRefine, 'El CUIT debe tener 11 dígitos (podés usar guiones).'),
    streetAddress: z.string().min(5, 'Indicá la dirección física del local.'),
    phone: z.string().max(40, 'El teléfono es demasiado largo.'),
    logoUrl: optionalPublicUrl,
    social: z.object({
      instagram: optionalPublicUrl,
      facebook: optionalPublicUrl,
      tiktok: optionalPublicUrl,
      website: optionalPublicUrl,
    }),
    businessHours: z
      .array(storeBusinessHoursDaySchema)
      .length(STORE_WEEKDAYS_ORDER.length)
      .superRefine((rows, ctx) => {
        rows.forEach((row, i) => {
          const expected = STORE_WEEKDAYS_ORDER[i];
          if (expected !== undefined && row.day !== expected) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Los días deben estar en orden de lunes a domingo.',
              path: [i, 'day'],
            });
          }
        });
      }),
  });

export type StoreProfileFormValues = z.infer<typeof storeProfileFormSchema>;

export function storeProfileFormDefaults(): StoreProfileFormValues {
  return {
    name: '',
    taxIdCuit: '',
    streetAddress: '',
    phone: '',
    logoUrl: '',
    social: {
      instagram: '',
      facebook: '',
      tiktok: '',
      website: '',
    },
    businessHours: createDefaultBusinessHours(),
  };
}
