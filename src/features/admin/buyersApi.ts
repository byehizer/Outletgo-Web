import {
  ADMIN_BUYERS_API_PATH,
  ADMIN_BUYERS_PAGE_SIZE,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type {
  BuyerAccount,
  BuyerAccountStats,
  DeactivateBuyerDTO,
  ResetBuyerPasswordDTO,
  UpdateBuyerEmailDTO,
} from '../../types/buyer-account';

type JsonRecord = Record<string, unknown>;

export type FetchBuyerAccountsParams = {
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

function pickNullableString(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null;
  }
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

function devIsoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
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

function coerceBuyerStats(o: JsonRecord): BuyerAccountStats {
  const statsRaw =
    typeof o.stats === 'object' && o.stats !== null ? (o.stats as JsonRecord) : o;
  return {
    totalOrders: Math.max(
      0,
      Math.floor(pickNumber(statsRaw.totalOrders ?? statsRaw.total_orders ?? statsRaw.orders)),
    ),
    totalReviews: Math.max(
      0,
      Math.floor(pickNumber(statsRaw.totalReviews ?? statsRaw.total_reviews ?? statsRaw.reviews)),
    ),
  };
}

function coerceBuyerAccount(payload: unknown): BuyerAccount | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }
  const id = pickString(o.id ?? o.buyerId ?? o.buyer_id);
  const email = pickString(o.email);
  const name = pickNullableString(o.name ?? o.fullName ?? o.full_name);
  const isActive = pickBoolean(o.isActive ?? o.is_active ?? o.active);
  const createdAt =
    pickString(o.createdAt ?? o.created_at ?? o.registeredAt) ?? '';
  if (!id || !email) {
    return undefined;
  }
  return {
    id,
    email,
    name,
    isActive,
    createdAt,
    stats: coerceBuyerStats(o),
  };
}

export function coercePageBuyerAccount(payload: unknown, fallbackSize: number): Page<BuyerAccount> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceBuyerAccount(row))
    .filter((x): x is BuyerAccount => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV). */
let devBuyerAccounts: BuyerAccount[] = [
  {
    id: 'buyer-001',
    email: 'juan.perez@ejemplo.ar',
    name: 'Juan Pérez',
    isActive: true,
    createdAt: devIsoDaysAgo(90),
    stats: { totalOrders: 12, totalReviews: 8 },
  },
  {
    id: 'buyer-002',
    email: 'mariana.lopez@ejemplo.ar',
    name: 'Mariana López',
    isActive: true,
    createdAt: devIsoDaysAgo(60),
    stats: { totalOrders: 4, totalReviews: 2 },
  },
  {
    id: 'buyer-003',
    email: 'carlos.benitez@ejemplo.ar',
    name: 'Carlos Benítez',
    isActive: true,
    createdAt: devIsoDaysAgo(30),
    stats: { totalOrders: 1, totalReviews: 0 },
  },
  {
    id: 'buyer-004',
    email: 'nuevo.usuario@ejemplo.ar',
    name: null,
    isActive: true,
    createdAt: devIsoDaysAgo(5),
    stats: { totalOrders: 0, totalReviews: 0 },
  },
  {
    id: 'buyer-005',
    email: 'inactivo.demo@ejemplo.ar',
    name: 'Lucía Herrera',
    isActive: false,
    createdAt: devIsoDaysAgo(120),
    stats: { totalOrders: 3, totalReviews: 1 },
  },
  {
    id: 'buyer-006',
    email: 'sofia.gomez@ejemplo.ar',
    name: 'Sofía Gómez',
    isActive: true,
    createdAt: devIsoDaysAgo(45),
    stats: { totalOrders: 18, totalReviews: 14 },
  },
];

function matchesSearch(account: BuyerAccount, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const name = account.name?.toLowerCase() ?? '';
  return name.includes(q) || account.email.toLowerCase().includes(q);
}

function matchesActiveFilter(account: BuyerAccount, isActive?: boolean): boolean {
  if (isActive === undefined) {
    return true;
  }
  return account.isActive === isActive;
}

function buildDevBuyerAccountsPage(params: FetchBuyerAccountsParams): Page<BuyerAccount> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devBuyerAccounts
    .filter((row) => matchesSearch(row, params.search))
    .filter((row) => matchesActiveFilter(row, params.isActive))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const start = pageZero * size;
  const slice = filtered.slice(start, start + size).map((row) => mockClone(row));
  return {
    content: slice,
    totalElements: filtered.length,
    number: pageZero,
    size,
  };
}

function findDevBuyerOrThrow(id: string): BuyerAccount {
  const row = devBuyerAccounts.find((b) => b.id === id);
  if (!row) {
    throw new ApiError(404, null, `No hay comprador «${id}» en desarrollo.`);
  }
  return row;
}

export async function fetchBuyerAccounts(
  params: FetchBuyerAccountsParams,
): Promise<Page<BuyerAccount>> {
  const body: FetchBuyerAccountsParams = {
    ...params,
    page: Math.max(0, params.page),
    size: Math.max(1, params.size),
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevBuyerAccountsPage(body));
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

  const raw = await apiClient.get<unknown>(`${ADMIN_BUYERS_API_PATH}?${sp.toString()}`);
  return coercePageBuyerAccount(raw, body.size);
}

export async function updateBuyerEmail(
  id: string,
  data: UpdateBuyerEmailDTO,
): Promise<BuyerAccount> {
  const buyerId = id.trim();
  const email = data.email.trim();
  if (!buyerId) {
    throw new ApiError(400, null, 'ID de comprador inválido.');
  }
  if (!email) {
    throw new ApiError(400, null, 'El email es obligatorio.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevBuyerOrThrow(buyerId);
    const updated: BuyerAccount = { ...current, email };
    devBuyerAccounts = devBuyerAccounts.map((row) =>
      row.id === buyerId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_BUYERS_API_PATH}/${encodeURIComponent(buyerId)}/email`,
    { email },
  );
  const account = coerceBuyerAccount(raw);
  if (!account) {
    throw new ApiError(500, raw, 'El servidor no devolvió el comprador actualizado.');
  }
  return account;
}

export async function resetBuyerPassword(
  id: string,
  data: ResetBuyerPasswordDTO,
): Promise<void> {
  const buyerId = id.trim();
  if (!buyerId) {
    throw new ApiError(400, null, 'ID de comprador inválido.');
  }
  if (data.temporaryPassword.length < 8) {
    throw new ApiError(400, null, 'La contraseña temporal debe tener al menos 8 caracteres.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    findDevBuyerOrThrow(buyerId);
    return;
  }

  await apiClient.post<unknown>(
    `${ADMIN_BUYERS_API_PATH}/${encodeURIComponent(buyerId)}/reset-password`,
    data,
  );
}

export async function toggleBuyerStatus(
  id: string,
  isActive: boolean,
  data: DeactivateBuyerDTO,
): Promise<BuyerAccount> {
  const buyerId = id.trim();
  if (!buyerId) {
    throw new ApiError(400, null, 'ID de comprador inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevBuyerOrThrow(buyerId);
    if (!isActive && data.reason.trim().length < 10) {
      throw new ApiError(400, null, 'El motivo de desactivación debe tener al menos 10 caracteres.');
    }
    const updated: BuyerAccount = { ...current, isActive };
    devBuyerAccounts = devBuyerAccounts.map((row) =>
      row.id === buyerId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_BUYERS_API_PATH}/${encodeURIComponent(buyerId)}/status`,
    { isActive, reason: data.reason },
  );
  const account = coerceBuyerAccount(raw);
  if (!account) {
    throw new ApiError(500, raw, 'El servidor no devolvió el comprador actualizado.');
  }
  return account;
}

export { ADMIN_BUYERS_PAGE_SIZE };
