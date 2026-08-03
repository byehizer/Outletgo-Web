import { apiClient } from '../../lib/http/apiClient';

export interface SellerRegistrationRequestInput {
  businessName: string;
  cuit: string;
  contactName: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface SellerRegistrationRequestItem extends SellerRegistrationRequestInput {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'outletgo_seller_requests_dev';

function getLocalRequests(): SellerRegistrationRequestItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalRequests(items: SellerRegistrationRequestItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Envía una solicitud de alta B2B desde la Landing Page.
 */
export async function submitSellerRegistrationRequest(
  data: SellerRegistrationRequestInput
): Promise<SellerRegistrationRequestItem> {
  try {
    return await apiClient.post<SellerRegistrationRequestItem>(
      '/api/landing/seller-requests',
      data,
      { skipAuth: true }
    );
  } catch {
    // Fallback a localStorage para desarrollo local sin backend conectado
    const newItem: SellerRegistrationRequestItem = {
      ...data,
      id: crypto.randomUUID(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    const list = getLocalRequests();
    list.unshift(newItem);
    saveLocalRequests(list);
    return newItem;
  }
}

/**
 * Obtiene todas las solicitudes de alta B2B para el panel de administración.
 */
export async function fetchSellerRequests(): Promise<SellerRegistrationRequestItem[]> {
  try {
    return await apiClient.get<SellerRegistrationRequestItem[]>(
      '/api/admin/seller-requests'
    );
  } catch {
    return getLocalRequests();
  }
}

/**
 * Actualiza el estado de una solicitud de alta B2B (PENDING | APPROVED | REJECTED).
 */
export async function updateSellerRequestStatus(
  id: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
): Promise<SellerRegistrationRequestItem | null> {
  try {
    return await apiClient.patch<SellerRegistrationRequestItem>(
      `/api/admin/seller-requests/${id}/status`,
      { status }
    );
  } catch {
    const list = getLocalRequests();
    const idx = list.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list[idx]!.status = status;
      saveLocalRequests(list);
      return list[idx]!;
    }
    return null;
  }
}
