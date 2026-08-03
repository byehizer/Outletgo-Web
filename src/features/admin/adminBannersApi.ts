import { apiClient } from '../../lib/http/apiClient';

export interface AdminBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  type: 'CAMPAIGN' | 'STORE' | 'PRODUCT';
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface CreateBannerRequest {
  title: string;
  description: string;
  imageUrl: string;
  type: 'CAMPAIGN' | 'STORE' | 'PRODUCT';
  startDate?: string;
  endDate?: string;
  storeIds?: string[];
  productIds?: string[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

export async function fetchAdminBanners(page = 0, size = 10): Promise<Page<AdminBanner>> {
  try {
    const res = await apiClient.get<Page<AdminBanner>>(`/api/admin/banners?page=${page}&size=${size}`);
    return {
      content: Array.isArray(res?.content) ? res.content : [],
      totalElements: res?.totalElements || 0,
      number: res?.number || page,
      size: res?.size || size,
    };
  } catch {
    // Si la API no esta disponible o falla, retornar unicamente un resultado vacio. SIN MOCKS.
    return {
      content: [],
      totalElements: 0,
      number: page,
      size,
    };
  }
}

export async function createAdminBanner(req: CreateBannerRequest): Promise<AdminBanner> {
  return apiClient.post<AdminBanner>('/api/admin/banners', req);
}

export async function toggleAdminBannerStatus(id: string, currentStatus: string): Promise<boolean> {
  const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  await apiClient.patch(`/api/admin/banners/${id}/status`, { status: newStatus });
  return true;
}

export async function deleteAdminBanner(id: string): Promise<boolean> {
  await apiClient.delete(`/api/admin/banners/${id}`);
  return true;
}
