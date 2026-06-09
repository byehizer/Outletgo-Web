import type { StoreProfileFormValues } from './storeSchema';
import {
  STORE_WEEKDAYS_ORDER,
  createDefaultBusinessHours,
  type StoreWeekday,
} from './storeSchema';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { SELLER_STORE_API_PATH } from '../../lib/constants';

type JsonRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function pickNumber(v: unknown): number {
  const n =
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && Number.isFinite(Number.parseFloat(v))
        ? Number.parseFloat(v)
        : NaN;
  return Number.isFinite(n) ? n : NaN;
}

export type StoreSocial = {
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
};

export type SellerStoreBusinessDay = {
  day: StoreWeekday;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

/** Perfil tienda en panel seller (Paso 16 + horarios / contacto / logo). */
export type SellerStoreProfile = {
  id: string;
  name: string;
  taxIdCuit: string;
  streetAddress: string;
  phone: string | null;
  logoUrl: string | null;
  latitude: number;
  longitude: number;
  social: StoreSocial;
  businessHours: SellerStoreBusinessDay[];
};

function defaultBusinessHoursFromApi(): SellerStoreBusinessDay[] {
  return createDefaultBusinessHours().map((row) => ({
    day: row.day,
    isClosed: row.isClosed,
    openTime: row.isClosed ? null : (row.openTime ?? '').trim() || null,
    closeTime: row.isClosed ? null : (row.closeTime ?? '').trim() || null,
  }));
}

function coerceBusinessHours(raw: unknown): SellerStoreBusinessDay[] {
  const defaults = defaultBusinessHoursFromApi();
  const map = new Map<StoreWeekday, SellerStoreBusinessDay>();
  defaults.forEach((d) => map.set(d.day, d));

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue;
      const o = item as JsonRecord;
      const dayRaw = pickString(o.day)?.toUpperCase();
      if (!dayRaw || !STORE_WEEKDAYS_ORDER.includes(dayRaw as StoreWeekday)) continue;
      const day = dayRaw as StoreWeekday;
      const isClosed = Boolean(o.isClosed ?? o.closed);
      const openT = pickString(o.openTime ?? o.open);
      const closeT = pickString(o.closeTime ?? o.close);
      map.set(day, {
        day,
        isClosed,
        openTime: isClosed ? null : openT ?? '09:00',
        closeTime: isClosed ? null : closeT ?? '18:00',
      });
    }
  }

  return STORE_WEEKDAYS_ORDER.map((d) => {
    const v = map.get(d);
    return v ?? defaults.find((x) => x.day === d)!;
  });
}

function coerceSocial(o: JsonRecord | undefined): StoreSocial {
  const root = o ?? {};
  return {
    instagram: pickString(root.instagram ?? root.instagramUrl) ?? null,
    facebook: pickString(root.facebook ?? root.facebookUrl) ?? null,
    tiktok: pickString(root.tiktok ?? root.tiktokUrl) ?? null,
    website: pickString(root.website ?? root.webUrl ?? root.siteUrl) ?? null,
  };
}

export function coerceSellerStoreProfile(raw: unknown): SellerStoreProfile {
  const o = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  const lat = pickNumber(o.latitude ?? o.lat);
  const lng = pickNumber(o.longitude ?? o.lng ?? o.lon);

  const socialRaw =
    typeof o.social === 'object' && o.social !== null ? (o.social as JsonRecord) : undefined;

  const hoursRaw = o.businessHours ?? o.openingHours ?? o.hours;

  return {
    id: pickString(o.id ?? o.uuid ?? o.storeId) ?? '',
    name: pickString(o.name ?? o.storeName ?? o.store_name) ?? '',
    taxIdCuit: pickString(o.taxIdCuit ?? o.tax_id_cuit ?? o.cuit ?? o.taxId) ?? '',
    streetAddress:
      pickString(o.streetAddress ?? o.street_address ?? o.address ?? o.fullAddress) ?? '',
    phone: pickString(o.phone ?? o.telephone ?? o.phoneNumber) ?? null,
    logoUrl:
      pickString(o.logoUrl ?? o.logo_url ?? o.logoURL ?? o.storeLogoUrl ?? o.avatarUrl) ?? null,
    latitude: Number.isFinite(lat) ? lat : -34.6625,
    longitude: Number.isFinite(lng) ? lng : -58.3672,
    social: coerceSocial(socialRaw),
    businessHours: coerceBusinessHours(hoursRaw),
  };
}

type StoreProfilePatchBody = {
  name: string;
  taxIdCuit: string;
  streetAddress: string;
  phone: string | null;
  logoUrl: string | null;
  social: StoreSocial;
  businessHours: SellerStoreBusinessDay[];
};

function formValuesToPatchBody(values: StoreProfileFormValues): StoreProfilePatchBody {
  return {
    name: values.name.trim(),
    taxIdCuit: values.taxIdCuit.trim(),
    streetAddress: values.streetAddress.trim(),
    phone: values.phone.trim().length > 0 ? values.phone.trim() : null,
    logoUrl: values.logoUrl.trim().length > 0 ? values.logoUrl.trim() : null,
    social: {
      instagram: values.social.instagram.trim() || null,
      facebook: values.social.facebook.trim() || null,
      tiktok: values.social.tiktok.trim() || null,
      website: values.social.website.trim() || null,
    },
    businessHours: values.businessHours.map((row) => ({
      day: row.day,
      isClosed: row.isClosed,
      openTime: row.isClosed ? null : row.openTime?.trim() ?? null,
      closeTime: row.isClosed ? null : row.closeTime?.trim() ?? null,
    })),
  };
}

export function sellerStoreProfileToFormValues(profile: SellerStoreProfile): StoreProfileFormValues {
  return {
    name: profile.name,
    taxIdCuit: profile.taxIdCuit,
    streetAddress: profile.streetAddress,
    phone: profile.phone ?? '',
    logoUrl: profile.logoUrl ?? '',
    social: {
      instagram: profile.social.instagram ?? '',
      facebook: profile.social.facebook ?? '',
      tiktok: profile.social.tiktok ?? '',
      website: profile.social.website ?? '',
    },
    businessHours: STORE_WEEKDAYS_ORDER.map((day) => {
      const row = profile.businessHours.find((b) => b.day === day);
      if (!row) {
        const d = defaultBusinessHoursFromApi().find((x) => x.day === day)!;
        return {
          day,
          isClosed: d.isClosed,
          openTime: d.openTime ?? '',
          closeTime: d.closeTime ?? '',
        };
      }
      return {
        day,
        isClosed: row.isClosed,
        openTime: row.openTime ?? '',
        closeTime: row.closeTime ?? '',
      };
    }),
  };
}

/** Geocodificación determinística para mock DEV: el pin cambia al guardar la dirección. */
function devStableGeocode(streetAddress: string): { latitude: number; longitude: number } {
  const s = streetAddress.trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const latitude = -34.55 + (u % 8000) / 100000;
  const longitude = -58.32 + ((u >>> 12) % 12000) / 100000;
  return { latitude, longitude };
}

/** Mock persistente sólo desarrollo — refleja guardados hasta recargar el sitio. */
let devSellerStore: SellerStoreProfile = {
  id: 'store-mock-ehizer',
  name: 'Textil Ehizer · Avellaneda',
  taxIdCuit: '30-76123451-9',
  streetAddress: 'Av. Mitre 2100 · Local feria · Avellaneda (GBA)',
  phone: '+54 11 2345-6789',
  logoUrl: 'https://picsum.photos/seed/outletgo-logo/256/256',
  latitude: -34.662,
  longitude: -58.365,
  social: {
    instagram: 'https://instagram.com/ejemplo.tienda',
    facebook: null,
    tiktok: null,
    website: null,
  },
  businessHours: [
    { day: 'MONDAY', isClosed: false, openTime: '08:30', closeTime: '18:30' },
    { day: 'TUESDAY', isClosed: false, openTime: '08:30', closeTime: '18:30' },
    { day: 'WEDNESDAY', isClosed: false, openTime: '08:30', closeTime: '18:30' },
    { day: 'THURSDAY', isClosed: false, openTime: '08:30', closeTime: '18:30' },
    { day: 'FRIDAY', isClosed: false, openTime: '08:30', closeTime: '19:00' },
    { day: 'SATURDAY', isClosed: false, openTime: '09:00', closeTime: '14:00' },
    { day: 'SUNDAY', isClosed: true, openTime: null, closeTime: null },
  ],
};

function devDelay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function mockClone<T>(v: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(v);
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function fetchSellerStoreProfile(): Promise<SellerStoreProfile> {
  if (import.meta.env.DEV) {
    return devDelay(mockClone(devSellerStore));
  }
  const raw = await apiClient.get<unknown>(SELLER_STORE_API_PATH);
  const rec = coerceSellerStoreProfile(raw);
  if (!rec.id) {
    throw new ApiError(500, raw, 'El servidor no devolvió un perfil de tienda válido.');
  }
  return rec;
}

export async function updateSellerStoreProfile(values: StoreProfileFormValues): Promise<SellerStoreProfile> {
  const body = formValuesToPatchBody(values);
  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    const geo = devStableGeocode(body.streetAddress);
    devSellerStore = {
      id: devSellerStore.id,
      name: body.name,
      taxIdCuit: body.taxIdCuit,
      streetAddress: body.streetAddress,
      phone: body.phone,
      logoUrl: body.logoUrl,
      social: body.social,
      businessHours: body.businessHours,
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
    return mockClone(devSellerStore);
  }
  const raw = await apiClient.patch<unknown>(SELLER_STORE_API_PATH, body);
  const rec = coerceSellerStoreProfile(raw);
  if (!rec.id) {
    throw new ApiError(500, raw, 'El servidor no devolvió el perfil actualizado.');
  }
  return rec;
}
