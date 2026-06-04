import {
  ADMIN_PICKUP_POINTS_API_PATH,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type { PickupPoint, PickupPointSavePayload } from '../../types/pickup-point';

type JsonRecord = Record<string, unknown>;

export type FetchPickupPointsParams = {
  page: number;
  size: number;
  search?: string;
  isActive?: boolean;
};

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickNumber(v: unknown): number {
  const n =
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && Number.isFinite(Number.parseFloat(v))
        ? Number.parseFloat(v)
        : NaN;
  return Number.isFinite(n) ? n : 0;
}

function pickBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') {
    return v;
  }
  if (v === 'true') {
    return true;
  }
  if (v === 'false') {
    return false;
  }
  return false;
}

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

function coercePickupPoint(payload: unknown): PickupPoint | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }
  const id = pickString(o.id ?? o.pickupPointId ?? o.pickup_point_id);
  const name = pickString(o.name ?? o.title) ?? '';
  const address = pickString(o.address ?? o.streetAddress ?? o.street_address) ?? '';
  const neighborhood = pickString(o.neighborhood ?? o.barrio) ?? '';
  const city = pickString(o.city ?? o.localidad) ?? '';
  const lat = pickNumber(o.lat ?? o.latitude);
  const lng = pickNumber(o.lng ?? o.longitude);
  const businessHours = pickString(o.businessHours ?? o.business_hours ?? o.hours) ?? '';
  const isActive = pickBoolean(o.isActive ?? o.is_active ?? o.active);

  if (!id || !name || !address) {
    return undefined;
  }

  return {
    id,
    name,
    address,
    neighborhood,
    city,
    lat,
    lng,
    businessHours,
    isActive,
  };
}

export function coercePagePickupPoint(payload: unknown, fallbackSize: number): Page<PickupPoint> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coercePickupPoint(row))
    .filter((x): x is PickupPoint => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV). */
let devPickupPoints: PickupPoint[] = [
  {
    id: 'pp-001',
    name: 'Punto Avellaneda Centro',
    address: 'Av. Mitre 1234',
    neighborhood: 'Avellaneda',
    city: 'Gran Buenos Aires',
    lat: -34.6621,
    lng: -58.3648,
    businessHours: 'Lunes a Viernes de 9:00 a 19:30hs',
    isActive: true,
  },
  {
    id: 'pp-002',
    name: 'Punto Palermo Soho',
    address: 'Thames 1800',
    neighborhood: 'Palermo',
    city: 'CABA',
    lat: -34.5885,
    lng: -58.4306,
    businessHours: 'Lunes a Sábado de 10:00 a 20:00hs',
    isActive: true,
  },
  {
    id: 'pp-003',
    name: 'Punto La Plata Plaza Moreno',
    address: 'Calle 12 750',
    neighborhood: 'Centro',
    city: 'La Plata',
    lat: -34.9214,
    lng: -57.9545,
    businessHours: 'Lunes a Viernes de 9:00 a 18:00hs',
    isActive: false,
  },
  {
    id: 'pp-004',
    name: 'Punto Flores',
    address: 'Av. Rivadavia 6500',
    neighborhood: 'Flores',
    city: 'CABA',
    lat: -34.6304,
    lng: -58.4639,
    businessHours: 'Lunes a Viernes de 9:00 a 19:00hs · Sábado de 9:00 a 13:00hs',
    isActive: true,
  },
];

let devPickupPointsCounter = devPickupPoints.length;

function matchesSearch(point: PickupPoint, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    point.name.toLowerCase().includes(q) ||
    point.city.toLowerCase().includes(q) ||
    point.neighborhood.toLowerCase().includes(q)
  );
}

function matchesActiveFilter(point: PickupPoint, isActive?: boolean): boolean {
  if (isActive === undefined) {
    return true;
  }
  return point.isActive === isActive;
}

function buildDevPickupPointsPage(params: FetchPickupPointsParams): Page<PickupPoint> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devPickupPoints
    .filter((row) => matchesSearch(row, params.search))
    .filter((row) => matchesActiveFilter(row, params.isActive))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const start = pageZero * size;
  const slice = filtered.slice(start, start + size).map((row) => mockClone(row));
  return {
    content: slice,
    totalElements: filtered.length,
    number: pageZero,
    size,
  };
}

function findDevPickupPointOrThrow(id: string): PickupPoint {
  const row = devPickupPoints.find((p) => p.id === id);
  if (!row) {
    throw new ApiError(404, null, `No hay punto de retiro «${id}» en desarrollo.`);
  }
  return row;
}

export async function fetchPickupPoints(
  params: FetchPickupPointsParams,
): Promise<Page<PickupPoint>> {
  const body: FetchPickupPointsParams = {
    ...params,
    page: Math.max(0, params.page),
    size: Math.max(1, params.size),
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevPickupPointsPage(body));
  }

  const sp = new URLSearchParams();
  sp.set('page', String(body.page));
  sp.set('size', String(body.size));
  const search = body.search?.trim();
  if (search) {
    sp.set('search', search);
  }
  if (body.isActive !== undefined) {
    sp.set('isActive', String(body.isActive));
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_PICKUP_POINTS_API_PATH}?${sp.toString()}`);
  return coercePagePickupPoint(raw, body.size);
}

export async function createPickupPoint(data: PickupPointSavePayload): Promise<PickupPoint> {
  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    devPickupPointsCounter += 1;
    const id = `pp-dev-${String(devPickupPointsCounter)}`;
    const created: PickupPoint = {
      id,
      name: data.name.trim(),
      address: data.address.trim(),
      neighborhood: data.neighborhood.trim(),
      city: data.city.trim(),
      lat: data.lat,
      lng: data.lng,
      businessHours: data.businessHours.trim(),
      isActive: true,
    };
    devPickupPoints = [created, ...devPickupPoints];
    return mockClone(created);
  }

  const raw = await apiClient.post<unknown>(ADMIN_PICKUP_POINTS_API_PATH, data);
  const point = coercePickupPoint(raw);
  if (!point) {
    throw new ApiError(500, raw, 'El servidor no devolvió el punto de retiro creado.');
  }
  return point;
}

export async function updatePickupPoint(
  id: string,
  data: PickupPointSavePayload,
): Promise<PickupPoint> {
  const pointId = id.trim();
  if (!pointId) {
    throw new ApiError(400, null, 'ID de punto de retiro inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevPickupPointOrThrow(pointId);
    const updated: PickupPoint = {
      ...current,
      name: data.name.trim(),
      address: data.address.trim(),
      neighborhood: data.neighborhood.trim(),
      city: data.city.trim(),
      lat: data.lat,
      lng: data.lng,
      businessHours: data.businessHours.trim(),
      isActive: data.isActive,
    };
    devPickupPoints = devPickupPoints.map((row) =>
      row.id === pointId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_PICKUP_POINTS_API_PATH}/${encodeURIComponent(pointId)}`,
    data,
  );
  const point = coercePickupPoint(raw);
  if (!point) {
    throw new ApiError(500, raw, 'El servidor no devolvió el punto de retiro actualizado.');
  }
  return point;
}

export async function togglePickupPointStatus(
  id: string,
  isActive: boolean,
  data: { reason: string },
): Promise<PickupPoint> {
  const pointId = id.trim();
  if (!pointId) {
    throw new ApiError(400, null, 'ID de punto de retiro inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevPickupPointOrThrow(pointId);
    if (!isActive && data.reason.trim().length < 10) {
      throw new ApiError(400, null, 'El motivo de desactivación debe tener al menos 10 caracteres.');
    }
    const updated: PickupPoint = { ...current, isActive };
    devPickupPoints = devPickupPoints.map((row) =>
      row.id === pointId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_PICKUP_POINTS_API_PATH}/${encodeURIComponent(pointId)}/status`,
    { isActive, reason: data.reason },
  );
  const point = coercePickupPoint(raw);
  if (!point) {
    throw new ApiError(500, raw, 'El servidor no devolvió el punto de retiro actualizado.');
  }
  return point;
}
