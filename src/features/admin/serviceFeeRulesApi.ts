import { ADMIN_SERVICE_FEE_RULES_API_PATH } from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type { ServiceFeeRule, ServiceFeeRuleSavePayload } from '../../types/service-fee-rule';

type JsonRecord = Record<string, unknown>;

export type FetchServiceFeeRulesParams = {
  page: number;
  size: number;
  search?: string;
  isActive?: boolean;
};

function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
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

function coerceServiceFeeRule(payload: unknown): ServiceFeeRule | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }
  const id = pickString(o.id) ?? '';
  const name = pickString(o.name) ?? '';
  const feeType = (pickString(o.feeType ?? o.fee_type) ?? 'FIXED') as 'FIXED' | 'PERCENTAGE';
  const feeValue = pickNumber(o.feeValue ?? o.fee_value);
  const feeTarget = (pickString(o.feeTarget ?? o.fee_target) ?? 'BUYER_SHIPPING') as 'BUYER_SHIPPING' | 'BUYER_ORDER' | 'SELLER_COMMISSION';
  const shippingMethod = pickString(o.shippingMethod ?? o.shipping_method) as 'RETIRO_EN_PUNTO' | 'ENVIO_CORREO' | null;
  const minOrderAmount = pickNumber(o.minOrderAmount ?? o.min_order_amount);
  const isActive = pickBoolean(o.isActive ?? o.is_active);
  const validFrom = pickString(o.validFrom ?? o.valid_from);
  const validUntil = pickString(o.validUntil ?? o.valid_until);
  const priority = Math.floor(pickNumber(o.priority));

  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    feeType,
    feeValue,
    feeTarget,
    shippingMethod,
    minOrderAmount,
    isActive,
    validFrom,
    validUntil,
    priority,
  };
}

export function coercePageServiceFeeRule(payload: unknown, fallbackSize: number): Page<ServiceFeeRule> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceServiceFeeRule(row))
    .filter((x): x is ServiceFeeRule => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV). */
let devServiceFeeRules: ServiceFeeRule[] = [
  {
    id: 'sfr-001',
    name: 'Tarifa fija base - Retiro en punto',
    feeType: 'FIXED',
    feeValue: 150,
    feeTarget: 'BUYER_SHIPPING',
    shippingMethod: 'RETIRO_EN_PUNTO',
    minOrderAmount: 0,
    isActive: true,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: null,
    priority: 1,
  },
  {
    id: 'sfr-002',
    name: 'Tarifa fija base - Envío Correo',
    feeType: 'FIXED',
    feeValue: 450,
    feeTarget: 'BUYER_SHIPPING',
    shippingMethod: 'ENVIO_CORREO',
    minOrderAmount: 0,
    isActive: true,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: null,
    priority: 1,
  },
  {
    id: 'sfr-003',
    name: 'Comisión estándar locales (10%)',
    feeType: 'PERCENTAGE',
    feeValue: 10,
    feeTarget: 'SELLER_COMMISSION',
    shippingMethod: null,
    minOrderAmount: 0,
    isActive: true,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: null,
    priority: 10,
  },
  {
    id: 'sfr-004',
    name: 'Comisión locales Premium (5%)',
    feeType: 'PERCENTAGE',
    feeValue: 5,
    feeTarget: 'SELLER_COMMISSION',
    shippingMethod: null,
    minOrderAmount: 20000,
    isActive: true,
    validFrom: '2026-05-01T00:00:00.000Z',
    validUntil: '2026-12-31T23:59:59.000Z',
    priority: 20,
  },
  {
    id: 'sfr-005',
    name: 'Tarifa por servicio de orden (Hot Sale)',
    feeType: 'PERCENTAGE',
    feeValue: 1.5,
    feeTarget: 'BUYER_ORDER',
    shippingMethod: null,
    minOrderAmount: 5000,
    isActive: false,
    validFrom: '2026-05-15T00:00:00.000Z',
    validUntil: '2026-05-20T23:59:59.000Z',
    priority: 100,
  }
];

let devCounter = devServiceFeeRules.length;

function matchesSearch(rule: ServiceFeeRule, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return rule.name.toLowerCase().includes(q);
}

function matchesActiveFilter(rule: ServiceFeeRule, isActive?: boolean): boolean {
  if (isActive === undefined) {
    return true;
  }
  return rule.isActive === isActive;
}

function buildDevRulesPage(params: FetchServiceFeeRulesParams): Page<ServiceFeeRule> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devServiceFeeRules
    .filter((row) => matchesSearch(row, params.search))
    .filter((row) => matchesActiveFilter(row, params.isActive))
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, 'es'));
  
  const start = pageZero * size;
  const slice = filtered.slice(start, start + size).map((row) => mockClone(row));
  
  return {
    content: slice,
    totalElements: filtered.length,
    number: pageZero,
    size,
  };
}

export async function fetchServiceFeeRules(
  params: FetchServiceFeeRulesParams,
): Promise<Page<ServiceFeeRule>> {
  if (import.meta.env.DEV) {
    return devDelay(buildDevRulesPage(params));
  }

  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('size', String(params.size));
  if (params.search?.trim()) {
    sp.set('search', params.search.trim());
  }
  if (params.isActive !== undefined) {
    sp.set('isActive', String(params.isActive));
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_SERVICE_FEE_RULES_API_PATH}?${sp.toString()}`);
  return coercePageServiceFeeRule(raw, params.size);
}

export async function createServiceFeeRule(data: ServiceFeeRuleSavePayload): Promise<ServiceFeeRule> {
  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    devCounter += 1;
    const created: ServiceFeeRule = {
      id: `sfr-dev-${devCounter}`,
      name: data.name.trim(),
      feeType: data.feeType,
      feeValue: data.feeValue,
      feeTarget: data.feeTarget,
      shippingMethod: data.feeTarget === 'BUYER_SHIPPING' ? data.shippingMethod : null,
      minOrderAmount: data.minOrderAmount,
      isActive: data.isActive,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      priority: data.priority,
    };
    devServiceFeeRules = [created, ...devServiceFeeRules];
    return mockClone(created);
  }

  const raw = await apiClient.post<unknown>(ADMIN_SERVICE_FEE_RULES_API_PATH, data);
  const rule = coerceServiceFeeRule(raw);
  if (!rule) {
    throw new ApiError(500, raw, 'El servidor no devolvió la regla creada.');
  }
  return rule;
}

export async function updateServiceFeeRule(
  id: string,
  data: ServiceFeeRuleSavePayload,
): Promise<ServiceFeeRule> {
  const ruleId = id.trim();
  if (!ruleId) {
    throw new ApiError(400, null, 'ID de regla inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = devServiceFeeRules.find((r) => r.id === ruleId);
    if (!current) {
      throw new ApiError(404, null, `Regla no encontrada.`);
    }
    const updated: ServiceFeeRule = {
      ...current,
      name: data.name.trim(),
      feeType: data.feeType,
      feeValue: data.feeValue,
      feeTarget: data.feeTarget,
      shippingMethod: data.feeTarget === 'BUYER_SHIPPING' ? data.shippingMethod : null,
      minOrderAmount: data.minOrderAmount,
      isActive: data.isActive,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      priority: data.priority,
    };
    devServiceFeeRules = devServiceFeeRules.map((row) => (row.id === ruleId ? updated : row));
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_SERVICE_FEE_RULES_API_PATH}/${encodeURIComponent(ruleId)}`,
    data,
  );
  const rule = coerceServiceFeeRule(raw);
  if (!rule) {
    throw new ApiError(500, raw, 'El servidor no devolvió la regla actualizada.');
  }
  return rule;
}

export async function toggleServiceFeeRuleStatus(
  id: string,
  isActive: boolean,
): Promise<ServiceFeeRule> {
  const ruleId = id.trim();
  if (!ruleId) {
    throw new ApiError(400, null, 'ID de regla inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 150);
    const current = devServiceFeeRules.find((r) => r.id === ruleId);
    if (!current) {
      throw new ApiError(404, null, `Regla no encontrada.`);
    }
    const updated: ServiceFeeRule = { ...current, isActive };
    devServiceFeeRules = devServiceFeeRules.map((row) => (row.id === ruleId ? updated : row));
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_SERVICE_FEE_RULES_API_PATH}/${encodeURIComponent(ruleId)}/status`,
    { isActive },
  );
  const rule = coerceServiceFeeRule(raw);
  if (!rule) {
    throw new ApiError(500, raw, 'El servidor no devolvió la regla actualizada.');
  }
  return rule;
}
