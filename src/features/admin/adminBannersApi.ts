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

const DEV_BANNERS: AdminBanner[] = [];

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
    return {
      content: import.meta.env.DEV ? DEV_BANNERS : [],
      totalElements: import.meta.env.DEV ? DEV_BANNERS.length : 0,
      number: page,
      size,
    };
  }
}

export async function createAdminBanner(req: CreateBannerRequest): Promise<AdminBanner> {
  try {
    return await apiClient.post<AdminBanner>('/api/admin/banners', req);
  } catch {
    const newBanner: AdminBanner = {
      id: `banner-${Date.now()}`,
      title: req.title,
      description: req.description,
      imageUrl: req.imageUrl,
      type: req.type,
      status: 'ACTIVE',
      startDate: req.startDate,
      endDate: req.endDate,
      createdAt: new Date().toISOString(),
    };
    DEV_BANNERS.unshift(newBanner);
    return newBanner;
  }
}

export async function toggleAdminBannerStatus(id: string, currentStatus: string): Promise<boolean> {
  const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  try {
    await apiClient.patch(`/api/admin/banners/${id}/status`, { status: newStatus });
    return true;
  } catch {
    const item = DEV_BANNERS.find(b => b.id === id);
    if (item) {
      item.status = newStatus as any;
    }
    return true;
  }
}

export async function deleteAdminBanner(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/admin/banners/${id}`);
    return true;
  } catch {
    const idx = DEV_BANNERS.findIndex(b => b.id === id);
    if (idx !== -1) {
      DEV_BANNERS.splice(idx, 1);
    }
    return true;
  }
}
