import {
  ADMIN_REPORTS_API_PATH,
  ADMIN_REPORTS_PAGE_SIZE,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type { DisableProductDTO } from '../../types/moderation';
import { PRODUCT_STATUS } from '../../types/product';
import {
  REPORT_RESOLUTION_TYPE,
  REPORT_STATUS,
  type DismissReportDTO,
  type DisableReportedStoreDTO,
  type ProductReport,
  type ReportResolutionType,
  type ReportStatus,
  type StoreReport,
  type WarnSellerDTO,
} from '../../types/report';

export { ADMIN_REPORTS_PAGE_SIZE };

type JsonRecord = Record<string, unknown>;

export type FetchProductReportsParams = {
  page: number;
  size?: number;
  search?: string;
  storeId?: string;
  productId?: string;
  status?: ReportStatus;
};

export type FetchStoreReportsParams = {
  page: number;
  size?: number;
  search?: string;
  storeId?: string;
  status?: ReportStatus;
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

function coerceReportStatus(raw: unknown): ReportStatus | undefined {
  const s = typeof raw === 'string' ? raw : '';
  if (
    s === REPORT_STATUS.PENDING ||
    s === REPORT_STATUS.DISMISSED ||
    s === REPORT_STATUS.RESOLVED
  ) {
    return s;
  }
  return undefined;
}

function coerceReportResolutionType(
  raw: unknown,
  status: ReportStatus,
): ReportResolutionType | null {
  if (status === REPORT_STATUS.PENDING || status === REPORT_STATUS.DISMISSED) {
    return null;
  }
  const s = typeof raw === 'string' ? raw : '';
  if (s === REPORT_RESOLUTION_TYPE.DISABLED) {
    return REPORT_RESOLUTION_TYPE.DISABLED;
  }
  if (s === REPORT_RESOLUTION_TYPE.WARNED) {
    return REPORT_RESOLUTION_TYPE.WARNED;
  }
  if (s === REPORT_RESOLUTION_TYPE.DISMISSED) {
    return REPORT_RESOLUTION_TYPE.DISMISSED;
  }
  return null;
}

function coerceProductStatus(raw: unknown) {
  const s = typeof raw === 'string' ? raw : '';
  if (
    s === PRODUCT_STATUS.ACTIVE ||
    s === PRODUCT_STATUS.PAUSED_BY_SELLER ||
    s === PRODUCT_STATUS.DISABLED_BY_ADMIN
  ) {
    return s;
  }
  return undefined;
}

function coerceProductReport(payload: unknown): ProductReport | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }

  const id = pickString(o.id);
  const reason = pickString(o.reason);
  const status = coerceReportStatus(o.status);
  const createdAt = pickString(o.createdAt ?? o.created_at) ?? '';
  if (!id || !reason || !status) {
    return undefined;
  }

  const reporterRaw =
    typeof o.reporter === 'object' && o.reporter !== null ? (o.reporter as JsonRecord) : null;
  const reporterId = pickString(reporterRaw?.id);
  const reporterEmail = pickString(reporterRaw?.email);
  if (!reporterId || !reporterEmail) {
    return undefined;
  }

  const productRaw =
    typeof o.product === 'object' && o.product !== null ? (o.product as JsonRecord) : null;
  const productId = pickString(productRaw?.id);
  const productName = pickString(productRaw?.name);
  const currentStatus = coerceProductStatus(productRaw?.currentStatus ?? productRaw?.current_status);
  const storeRaw =
    typeof productRaw?.store === 'object' && productRaw.store !== null
      ? (productRaw.store as JsonRecord)
      : null;
  const storeId = pickString(storeRaw?.id);
  const businessName = pickString(storeRaw?.businessName ?? storeRaw?.business_name);
  if (!productId || !productName || !currentStatus || !storeId || !businessName) {
    return undefined;
  }

  return {
    id,
    reason,
    status,
    resolutionType: coerceReportResolutionType(o.resolutionType ?? o.resolution_type, status),
    createdAt,
    reporter: {
      id: reporterId,
      displayName: pickNullableString(reporterRaw?.displayName ?? reporterRaw?.display_name),
      email: reporterEmail,
    },
    product: {
      id: productId,
      name: productName,
      currentStatus,
      store: { id: storeId, businessName },
    },
  };
}

function coerceStoreReport(payload: unknown): StoreReport | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }

  const id = pickString(o.id);
  const reason = pickString(o.reason);
  const status = coerceReportStatus(o.status);
  const createdAt = pickString(o.createdAt ?? o.created_at) ?? '';
  if (!id || !reason || !status) {
    return undefined;
  }

  const reporterRaw =
    typeof o.reporter === 'object' && o.reporter !== null ? (o.reporter as JsonRecord) : null;
  const reporterId = pickString(reporterRaw?.id);
  const reporterEmail = pickString(reporterRaw?.email);
  if (!reporterId || !reporterEmail) {
    return undefined;
  }

  const storeRaw = typeof o.store === 'object' && o.store !== null ? (o.store as JsonRecord) : null;
  const storeId = pickString(storeRaw?.id);
  const businessName = pickString(storeRaw?.businessName ?? storeRaw?.business_name);
  if (!storeId || !businessName) {
    return undefined;
  }

  return {
    id,
    reason,
    status,
    resolutionType: coerceReportResolutionType(o.resolutionType ?? o.resolution_type, status),
    createdAt,
    reporter: {
      id: reporterId,
      displayName: pickNullableString(reporterRaw?.displayName ?? reporterRaw?.display_name),
      email: reporterEmail,
    },
    store: {
      id: storeId,
      businessName,
      isActive: pickBoolean(storeRaw?.isActive ?? storeRaw?.is_active ?? true),
    },
  };
}

function coercePageProductReports(payload: unknown, fallbackSize: number): Page<ProductReport> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceProductReport(row))
    .filter((x): x is ProductReport => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

function coercePageStoreReports(payload: unknown, fallbackSize: number): Page<StoreReport> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceStoreReport(row))
    .filter((x): x is StoreReport => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV) — reportes de productos. */
let devProductReports: ProductReport[] = [
  {
    id: 'pr-001',
    reason:
      'El producto recibido no coincide con las fotos publicadas. Los colores y el material son distintos a lo anunciado.',
    status: REPORT_STATUS.PENDING,
    resolutionType: null,
    createdAt: devIsoDaysAgo(2),
    reporter: {
      id: 'buyer-001',
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
    product: {
      id: 'mod-p1',
      name: 'Remera Oversize Avellaneda',
      currentStatus: PRODUCT_STATUS.ACTIVE,
      store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    },
  },
  {
    id: 'pr-002',
    reason:
      'Precio engañoso en la descripción: promocionan un descuento que no aplica al checkout.',
    status: REPORT_STATUS.PENDING,
    resolutionType: null,
    createdAt: devIsoDaysAgo(1),
    reporter: {
      id: 'buyer-006',
      displayName: 'Sofía Gómez',
      email: 'sofia.gomez@ejemplo.ar',
    },
    product: {
      id: 'mod-p5',
      name: 'Zapatilla urbana multicolor',
      currentStatus: PRODUCT_STATUS.ACTIVE,
      store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    },
  },
  {
    id: 'pr-003',
    reason:
      'Reporte por supuesta falsificación. Tras revisar las etiquetas y la factura, el producto parece original.',
    status: REPORT_STATUS.DISMISSED,
    resolutionType: null,
    createdAt: devIsoDaysAgo(8),
    reporter: {
      id: 'buyer-002',
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
    product: {
      id: 'mod-p2',
      name: 'Buzo Frisa Premium',
      currentStatus: PRODUCT_STATUS.ACTIVE,
      store: { id: 'store-002', businessName: 'Moda Flores Local' },
    },
  },
  {
    id: 'pr-004',
    reason:
      'Descripción engañosa sobre materiales y origen. El comprador indica que la campera no es de la marca anunciada.',
    status: REPORT_STATUS.RESOLVED,
    resolutionType: REPORT_RESOLUTION_TYPE.DISABLED,
    createdAt: devIsoDaysAgo(14),
    reporter: {
      id: 'buyer-005',
      displayName: 'Lucía Herrera',
      email: 'inactivo.demo@ejemplo.ar',
    },
    product: {
      id: 'mod-p4',
      name: 'Campera inflable (replica)',
      currentStatus: PRODUCT_STATUS.DISABLED_BY_ADMIN,
      store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    },
  },
  {
    id: 'pr-005',
    reason:
      'El vendedor pausó el producto pero sigue apareciendo en búsquedas con stock disponible según la app.',
    status: REPORT_STATUS.PENDING,
    resolutionType: null,
    createdAt: devIsoDaysAgo(4),
    reporter: {
      id: 'buyer-004',
      displayName: null,
      email: 'nuevo.usuario@ejemplo.ar',
    },
    product: {
      id: 'mod-p3',
      name: 'Jean Mom Rígido Local',
      currentStatus: PRODUCT_STATUS.PAUSED_BY_SELLER,
      store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    },
  },
  {
    id: 'pr-006',
    reason: 'Contenido ofensivo en las imágenes del producto según las políticas de la plataforma.',
    status: REPORT_STATUS.DISMISSED,
    resolutionType: null,
    createdAt: devIsoDaysAgo(20),
    reporter: {
      id: 'buyer-003',
      displayName: 'Carlos Benítez',
      email: 'carlos.benitez@ejemplo.ar',
    },
    product: {
      id: 'mod-p1',
      name: 'Remera Oversize Avellaneda',
      currentStatus: PRODUCT_STATUS.ACTIVE,
      store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    },
  },
];

/** Estado demo mutable (DEV) — reportes de tiendas. */
let devStoreReports: StoreReport[] = [
  {
    id: 'sr-001',
    reason:
      'La tienda responde de forma agresiva por chat y usa lenguaje inapropiado con los compradores.',
    status: REPORT_STATUS.PENDING,
    resolutionType: null,
    createdAt: devIsoDaysAgo(3),
    reporter: {
      id: 'buyer-001',
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
    store: {
      id: 'store-002',
      businessName: 'Moda Flores Local',
      isActive: true,
    },
  },
  {
    id: 'sr-002',
    reason:
      'Reporte duplicado sobre tiempos de envío. Los plazos informados coinciden con lo publicado en la tienda.',
    status: REPORT_STATUS.DISMISSED,
    resolutionType: null,
    createdAt: devIsoDaysAgo(10),
    reporter: {
      id: 'buyer-002',
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
    store: {
      id: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      isActive: true,
    },
  },
  {
    id: 'sr-003',
    reason:
      'Actividad fraudulenta: múltiples compradores reportan cobros sin entrega de productos.',
    status: REPORT_STATUS.RESOLVED,
    resolutionType: REPORT_RESOLUTION_TYPE.DISABLED,
    createdAt: devIsoDaysAgo(25),
    reporter: {
      id: 'buyer-005',
      displayName: 'Lucía Herrera',
      email: 'inactivo.demo@ejemplo.ar',
    },
    store: {
      id: 'store-003',
      businessName: 'Tienda Pausada Demo',
      isActive: false,
    },
  },
  {
    id: 'sr-004',
    reason: 'Imágenes de portada con contenido que no cumple las normas de la comunidad.',
    status: REPORT_STATUS.PENDING,
    resolutionType: null,
    createdAt: devIsoDaysAgo(6),
    reporter: {
      id: 'buyer-006',
      displayName: 'Sofía Gómez',
      email: 'sofia.gomez@ejemplo.ar',
    },
    store: {
      id: 'store-005',
      businessName: 'Jean & Remera Outlet',
      isActive: true,
    },
  },
];

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const totalElements = items.length;
  const start = page * size;
  const content = items.slice(start, start + size);
  return {
    content,
    totalElements,
    number: page,
    size,
  };
}

function matchesProductReportSearch(report: ProductReport, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    report.reason.toLowerCase().includes(q) ||
    report.product.name.toLowerCase().includes(q) ||
    report.product.store.businessName.toLowerCase().includes(q) ||
    report.reporter.email.toLowerCase().includes(q) ||
    (report.reporter.displayName?.toLowerCase().includes(q) ?? false)
  );
}

function matchesStoreReportSearch(report: StoreReport, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    report.reason.toLowerCase().includes(q) ||
    report.store.businessName.toLowerCase().includes(q) ||
    report.reporter.email.toLowerCase().includes(q) ||
    (report.reporter.displayName?.toLowerCase().includes(q) ?? false)
  );
}

function filterProductReports(params: FetchProductReportsParams): ProductReport[] {
  return devProductReports.filter((report) => {
    if (params.status && report.status !== params.status) {
      return false;
    }
    if (params.storeId && report.product.store.id !== params.storeId) {
      return false;
    }
    if (params.productId && report.product.id !== params.productId) {
      return false;
    }
    if (!matchesProductReportSearch(report, params.search)) {
      return false;
    }
    return true;
  });
}

function filterStoreReports(params: FetchStoreReportsParams): StoreReport[] {
  return devStoreReports.filter((report) => {
    if (params.status && report.status !== params.status) {
      return false;
    }
    if (params.storeId && report.store.id !== params.storeId) {
      return false;
    }
    if (!matchesStoreReportSearch(report, params.search)) {
      return false;
    }
    return true;
  });
}

function findProductReportIndex(id: string): number {
  return devProductReports.findIndex((r) => r.id === id);
}

function findStoreReportIndex(id: string): number {
  return devStoreReports.findIndex((r) => r.id === id);
}

export async function fetchProductReports(
  params: FetchProductReportsParams,
): Promise<Page<ProductReport>> {
  const size = params.size ?? ADMIN_REPORTS_PAGE_SIZE;
  const page = Math.max(0, params.page);

  if (import.meta.env.DEV) {
    const filtered = filterProductReports(params);
    return devDelay(paginate(filtered.map(mockClone), page, size));
  }

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('size', String(size));
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.storeId) {
    query.set('storeId', params.storeId);
  }
  if (params.productId) {
    query.set('productId', params.productId);
  }
  if (params.status) {
    query.set('status', params.status);
  }

  const payload = await apiClient.get(`${ADMIN_REPORTS_API_PATH}/products?${query.toString()}`);
  return coercePageProductReports(payload, size);
}

export async function fetchStoreReports(
  params: FetchStoreReportsParams,
): Promise<Page<StoreReport>> {
  const size = params.size ?? ADMIN_REPORTS_PAGE_SIZE;
  const page = Math.max(0, params.page);

  if (import.meta.env.DEV) {
    const filtered = filterStoreReports(params);
    return devDelay(paginate(filtered.map(mockClone), page, size));
  }

  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('size', String(size));
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.storeId) {
    query.set('storeId', params.storeId);
  }
  if (params.status) {
    query.set('status', params.status);
  }

  const payload = await apiClient.get(`${ADMIN_REPORTS_API_PATH}/stores?${query.toString()}`);
  return coercePageStoreReports(payload, size);
}

export async function dismissReport(
  id: string,
  data: DismissReportDTO,
): Promise<ProductReport | StoreReport> {
  if (import.meta.env.DEV) {
    const productIdx = findProductReportIndex(id);
    if (productIdx >= 0) {
      const current = devProductReports[productIdx];
      if (!current) {
        throw new ApiError(404, null, 'Reporte no encontrado.');
      }
      if (current.status !== REPORT_STATUS.PENDING) {
        throw new ApiError(400, null, 'Solo se pueden desestimar reportes pendientes.');
      }
      if (!data.reason.trim() || data.reason.trim().length < 10) {
        throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
      }
      const updated: ProductReport = {
        ...mockClone(current),
        status: REPORT_STATUS.DISMISSED,
        resolutionType: null,
      };
      devProductReports[productIdx] = updated;
      return devDelay(mockClone(updated));
    }

    const storeIdx = findStoreReportIndex(id);
    if (storeIdx >= 0) {
      const current = devStoreReports[storeIdx];
      if (!current) {
        throw new ApiError(404, null, 'Reporte no encontrado.');
      }
      if (current.status !== REPORT_STATUS.PENDING) {
        throw new ApiError(400, null, 'Solo se pueden desestimar reportes pendientes.');
      }
      if (!data.reason.trim() || data.reason.trim().length < 10) {
        throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
      }
      const updated: StoreReport = {
        ...mockClone(current),
        status: REPORT_STATUS.DISMISSED,
        resolutionType: null,
      };
      devStoreReports[storeIdx] = updated;
      return devDelay(mockClone(updated));
    }

    throw new ApiError(404, null, 'Reporte no encontrado.');
  }

  const payload = await apiClient.post(`${ADMIN_REPORTS_API_PATH}/${id}/dismiss`, data);
  const asProduct = coerceProductReport(payload);
  if (asProduct) {
    return asProduct;
  }
  const asStore = coerceStoreReport(payload);
  if (asStore) {
    return asStore;
  }
  throw new ApiError(502, null, 'Respuesta de reporte inválida.');
}

export async function disableReportedProduct(
  reportId: string,
  productId: string,
  data: DisableProductDTO,
): Promise<ProductReport> {
  if (import.meta.env.DEV) {
    const idx = findProductReportIndex(reportId);
    if (idx < 0) {
      throw new ApiError(404, null, 'Reporte no encontrado.');
    }
    const current = devProductReports[idx];
    if (!current) {
      throw new ApiError(404, null, 'Reporte no encontrado.');
    }
    if (current.product.id !== productId) {
      throw new ApiError(400, null, 'El producto no coincide con el reporte.');
    }
    if (!data.reason.trim() || data.reason.trim().length < 10) {
      throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
    }
    const updated: ProductReport = {
      ...mockClone(current),
      status: REPORT_STATUS.RESOLVED,
      resolutionType: REPORT_RESOLUTION_TYPE.DISABLED,
      product: {
        ...current.product,
        currentStatus: PRODUCT_STATUS.DISABLED_BY_ADMIN,
      },
    };
    devProductReports[idx] = updated;
    return devDelay(mockClone(updated));
  }

  const payload = await apiClient.post(
    `${ADMIN_REPORTS_API_PATH}/${reportId}/disable-product`,
    { productId, ...data },
  );
  const report = coerceProductReport(payload);
  if (!report) {
    throw new ApiError(502, null, 'Respuesta de reporte inválida.');
  }
  return report;
}

export async function disableReportedStore(
  reportId: string,
  storeId: string,
  data: DisableReportedStoreDTO,
): Promise<StoreReport> {
  if (import.meta.env.DEV) {
    const idx = findStoreReportIndex(reportId);
    if (idx < 0) {
      throw new ApiError(404, null, 'Reporte no encontrado.');
    }
    const current = devStoreReports[idx];
    if (!current) {
      throw new ApiError(404, null, 'Reporte no encontrado.');
    }
    if (current.store.id !== storeId) {
      throw new ApiError(400, null, 'La tienda no coincide con el reporte.');
    }
    if (!data.reason.trim() || data.reason.trim().length < 10) {
      throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
    }
    const updated: StoreReport = {
      ...mockClone(current),
      status: REPORT_STATUS.RESOLVED,
      resolutionType: REPORT_RESOLUTION_TYPE.DISABLED,
      store: {
        ...current.store,
        isActive: false,
      },
    };
    devStoreReports[idx] = updated;
    return devDelay(mockClone(updated));
  }

  const payload = await apiClient.post(
    `${ADMIN_REPORTS_API_PATH}/${reportId}/disable-store`,
    { storeId, ...data },
  );
  const report = coerceStoreReport(payload);
  if (!report) {
    throw new ApiError(502, null, 'Respuesta de reporte inválida.');
  }
  return report;
}

function assertWarnMessage(message: string): void {
  const trimmed = message.trim();
  if (trimmed.length < 20) {
    throw new ApiError(400, null, 'El mensaje debe tener al menos 20 caracteres.');
  }
  if (trimmed.length > 500) {
    throw new ApiError(400, null, 'El mensaje no puede superar 500 caracteres.');
  }
}

function assertCanWarnFromReport(status: ReportStatus): void {
  if (status !== REPORT_STATUS.PENDING && status !== REPORT_STATUS.DISMISSED) {
    throw new ApiError(400, null, 'No se puede enviar una advertencia en este estado.');
  }
}

export async function warnSellerFromReport(
  reportId: string,
  data: WarnSellerDTO,
): Promise<ProductReport | StoreReport> {
  if (import.meta.env.DEV) {
    assertWarnMessage(data.message);

    const productIdx = findProductReportIndex(reportId);
    if (productIdx >= 0) {
      const current = devProductReports[productIdx];
      if (!current) {
        throw new ApiError(404, null, 'Reporte no encontrado.');
      }
      assertCanWarnFromReport(current.status);
      const updated: ProductReport = {
        ...mockClone(current),
        status: REPORT_STATUS.RESOLVED,
        resolutionType: REPORT_RESOLUTION_TYPE.WARNED,
      };
      devProductReports[productIdx] = updated;
      return devDelay(mockClone(updated));
    }

    const storeIdx = findStoreReportIndex(reportId);
    if (storeIdx >= 0) {
      const current = devStoreReports[storeIdx];
      if (!current) {
        throw new ApiError(404, null, 'Reporte no encontrado.');
      }
      assertCanWarnFromReport(current.status);
      const updated: StoreReport = {
        ...mockClone(current),
        status: REPORT_STATUS.RESOLVED,
        resolutionType: REPORT_RESOLUTION_TYPE.WARNED,
      };
      devStoreReports[storeIdx] = updated;
      return devDelay(mockClone(updated));
    }

    throw new ApiError(404, null, 'Reporte no encontrado.');
  }

  const payload = await apiClient.post(`${ADMIN_REPORTS_API_PATH}/${reportId}/warn`, data);
  const asProduct = coerceProductReport(payload);
  if (asProduct) {
    return asProduct;
  }
  const asStore = coerceStoreReport(payload);
  if (asStore) {
    return asStore;
  }
  throw new ApiError(502, null, 'Respuesta de reporte inválida.');
}
