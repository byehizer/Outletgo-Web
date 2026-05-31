import {
  ADMIN_SELLERS_API_PATH,
  ADMIN_SELLERS_PAGE_SIZE,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type {
  CreateSellerAccountDTO,
  DeactivateSellerDTO,
  SellerAccount,
  SellerAccountStore,
  UpdateSellerAccountDTO,
} from '../../types/seller-account';

type JsonRecord = Record<string, unknown>;

export type FetchSellerAccountsParams = {
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

function pickNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  const n = pickNumber(v);
  return Number.isFinite(n) ? n : null;
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

function coerceSellerAccountStore(o: JsonRecord): SellerAccountStore | undefined {
  const id = pickString(o.id ?? o.storeId ?? o.store_id);
  const businessName =
    pickString(o.businessName ?? o.business_name ?? o.name ?? o.title) ?? '';
  const cuit = pickString(o.cuit ?? o.taxIdCuit ?? o.tax_id_cuit) ?? '';
  const address = pickString(o.address ?? o.streetAddress ?? o.street_address) ?? '';
  const description = pickString(o.description) ?? '';
  const headerImageUrl =
    pickString(o.headerImageUrl ?? o.header_image_url) ?? null;
  const ratingAvg = pickNullableNumber(o.ratingAvg ?? o.rating_avg);
  const ratingCount = Math.max(
    0,
    Math.floor(pickNumber(o.ratingCount ?? o.rating_count)),
  );
  if (!id || !businessName) {
    return undefined;
  }
  return {
    id,
    businessName,
    cuit,
    address,
    description,
    headerImageUrl,
    ratingAvg,
    ratingCount,
  };
}

function coerceSellerAccount(payload: unknown): SellerAccount | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }
  const id = pickString(o.id ?? o.sellerId ?? o.seller_id);
  const email = pickString(o.email);
  const isActive = pickBoolean(o.isActive ?? o.is_active ?? o.active);
  const createdAt =
    pickString(o.createdAt ?? o.created_at ?? o.registeredAt) ?? '';
  const storeRaw = o.store ?? o.shop ?? o.tienda;
  const store =
    typeof storeRaw === 'object' && storeRaw !== null
      ? coerceSellerAccountStore(storeRaw as JsonRecord)
      : undefined;
  if (!id || !email || !store) {
    return undefined;
  }
  return { id, email, isActive, createdAt, store };
}

export function coercePageSellerAccount(payload: unknown, fallbackSize: number): Page<SellerAccount> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceSellerAccount(row))
    .filter((x): x is SellerAccount => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV). */
let devSellerAccounts: SellerAccount[] = [
  {
    id: 'seller-001',
    email: 'mariana.lopez@outletgo.demo',
    isActive: true,
    createdAt: devIsoDaysAgo(120),
    store: {
      id: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      cuit: '20123456789',
      address: 'Av. Mitre 1234, Avellaneda',
      description: 'Ropa y calzado de outlet en zona sur.',
      headerImageUrl: 'https://picsum.photos/seed/store001/64/64',
      ratingAvg: 4.3,
      ratingCount: 28,
    },
  },
  {
    id: 'seller-002',
    email: 'carlos.benitez@outletgo.demo',
    isActive: true,
    createdAt: devIsoDaysAgo(45),
    store: {
      id: 'store-002',
      businessName: 'Moda Flores Local',
      cuit: '20987654321',
      address: 'Av. Rivadavia 4500, CABA',
      description: 'Indumentaria urbana y accesorios.',
      headerImageUrl: 'https://picsum.photos/seed/store002/64/64',
      ratingAvg: null,
      ratingCount: 0,
    },
  },
  {
    id: 'seller-003',
    email: 'inactivo.demo@outletgo.com',
    isActive: false,
    createdAt: devIsoDaysAgo(200),
    store: {
      id: 'store-003',
      businessName: 'Tienda Pausada Demo',
      cuit: '20333444555',
      address: 'Calle Falsa 123, La Plata',
      description: 'Cuenta desactivada por moderación.',
      headerImageUrl: null,
      ratingAvg: 2.8,
      ratingCount: 5,
    },
  },
  {
    id: 'seller-004',
    email: 'nueva.cuenta@outletgo.demo',
    isActive: true,
    createdAt: devIsoDaysAgo(3),
    store: {
      id: 'store-004',
      businessName: 'Nuevo Local Palermo',
      cuit: '20444555666',
      address: 'Thames 1800, Palermo',
      description: 'Alta reciente — perfil en construcción.',
      headerImageUrl: 'https://picsum.photos/seed/store004/64/64',
      ratingAvg: 4.8,
      ratingCount: 6,
    },
  },
  {
    id: 'seller-005',
    email: 'lucia.herrera@outletgo.demo',
    isActive: true,
    createdAt: devIsoDaysAgo(15),
    store: {
      id: 'store-005',
      businessName: 'Jean & Remera Outlet',
      cuit: '20555666777',
      address: 'San Martín 900, Rosario',
      description: '',
      headerImageUrl: null,
      ratingAvg: 3.9,
      ratingCount: 12,
    },
  },
];

let devSellerIdCounter = devSellerAccounts.length;

function matchesSearch(account: SellerAccount, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    account.email.toLowerCase().includes(q) ||
    account.store.businessName.toLowerCase().includes(q)
  );
}

function matchesActiveFilter(account: SellerAccount, isActive?: boolean): boolean {
  if (isActive === undefined) {
    return true;
  }
  return account.isActive === isActive;
}

function buildDevSellerAccountsPage(params: FetchSellerAccountsParams): Page<SellerAccount> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devSellerAccounts
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

function findDevSellerOrThrow(id: string): SellerAccount {
  const row = devSellerAccounts.find((s) => s.id === id);
  if (!row) {
    throw new ApiError(404, null, `No hay vendedor «${id}» en desarrollo.`);
  }
  return row;
}

export async function fetchSellerAccounts(
  params: FetchSellerAccountsParams,
): Promise<Page<SellerAccount>> {
  const body: FetchSellerAccountsParams = {
    ...params,
    page: Math.max(0, params.page),
    size: Math.max(1, params.size),
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevSellerAccountsPage(body));
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

  const raw = await apiClient.get<unknown>(`${ADMIN_SELLERS_API_PATH}?${sp.toString()}`);
  return coercePageSellerAccount(raw, body.size);
}

export async function createSellerAccount(data: CreateSellerAccountDTO): Promise<SellerAccount> {
  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    devSellerIdCounter += 1;
    const id = `seller-dev-${String(devSellerIdCounter)}`;
    const storeId = `store-dev-${String(devSellerIdCounter)}`;
    const created: SellerAccount = {
      id,
      email: data.email.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
      store: {
        id: storeId,
        businessName: data.businessName.trim(),
        cuit: data.cuit.trim(),
        address: data.address.trim(),
        description: data.description?.trim() ?? '',
        headerImageUrl: null,
        ratingAvg: null,
        ratingCount: 0,
      },
    };
    devSellerAccounts = [created, ...devSellerAccounts];
    return mockClone(created);
  }

  const raw = await apiClient.post<unknown>(ADMIN_SELLERS_API_PATH, data);
  const account = coerceSellerAccount(raw);
  if (!account) {
    throw new ApiError(500, raw, 'El servidor no devolvió el vendedor creado.');
  }
  return account;
}

export async function updateSellerAccount(
  id: string,
  data: UpdateSellerAccountDTO,
): Promise<SellerAccount> {
  const sellerId = id.trim();
  if (!sellerId) {
    throw new ApiError(400, null, 'ID de vendedor inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevSellerOrThrow(sellerId);
    const updated: SellerAccount = {
      ...current,
      email: data.email.trim(),
      store: {
        ...current.store,
        businessName: data.businessName.trim(),
        cuit: data.cuit.trim(),
        address: data.address.trim(),
        description: data.description?.trim() ?? '',
        headerImageUrl:
          data.headerImageUrl !== undefined
            ? data.headerImageUrl
            : current.store.headerImageUrl,
      },
    };
    devSellerAccounts = devSellerAccounts.map((row) =>
      row.id === sellerId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_SELLERS_API_PATH}/${encodeURIComponent(sellerId)}`,
    data,
  );
  const account = coerceSellerAccount(raw);
  if (!account) {
    throw new ApiError(500, raw, 'El servidor no devolvió el vendedor actualizado.');
  }
  return account;
}

export async function toggleSellerStatus(
  id: string,
  isActive: boolean,
  data: DeactivateSellerDTO,
): Promise<SellerAccount> {
  const sellerId = id.trim();
  if (!sellerId) {
    throw new ApiError(400, null, 'ID de vendedor inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevSellerOrThrow(sellerId);
    if (!isActive && data.reason.trim().length < 10) {
      throw new ApiError(400, null, 'El motivo de desactivación debe tener al menos 10 caracteres.');
    }
    const updated: SellerAccount = { ...current, isActive };
    devSellerAccounts = devSellerAccounts.map((row) =>
      row.id === sellerId ? updated : row,
    );
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_SELLERS_API_PATH}/${encodeURIComponent(sellerId)}/status`,
    { isActive, reason: data.reason },
  );
  const account = coerceSellerAccount(raw);
  if (!account) {
    throw new ApiError(500, raw, 'El servidor no devolvió el vendedor actualizado.');
  }
  return account;
}

/** Usado por hooks/páginas en DEV para refrescar listado. */
export function buildDevSellerAccountsPageForHook(
  params: FetchSellerAccountsParams,
): Page<SellerAccount> {
  return buildDevSellerAccountsPage(params);
}

export { ADMIN_SELLERS_PAGE_SIZE };
