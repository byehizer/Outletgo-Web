import { apiClient } from '../../lib/http/apiClient';

export interface AdminBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  type: 'CAMPAIGN' | 'STORE' | 'PRODUCT';
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CreateBannerRequest {
  title: string;
  description: string;
  imageUrl: string;
  type: 'CAMPAIGN' | 'STORE' | 'PRODUCT';
  startDate: string;
  endDate: string;
  storeIds: string[];
  productIds: string[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

// ALMACENAMIENTO DE MOCK EN MEMORIA PARA MERN DEV MODE
const DEV_BANNERS: AdminBanner[] = [
  {
    id: 'banner-1',
    title: 'Gran Campaña de Invierno',
    description: 'Prendas y tiendas seleccionadas con hasta 50% de descuento',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop',
    type: 'CAMPAIGN',
    status: 'ACTIVE',
    startDate: '2026-07-01T00:00:00Z',
    endDate: '2026-08-31T23:59:59Z',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'banner-2',
    title: 'Día del Zapato',
    description: 'Todo el calzado participante reunido en un solo lugar',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
    type: 'CAMPAIGN',
    status: 'ACTIVE',
    startDate: '2026-07-10T00:00:00Z',
    endDate: '2026-07-20T23:59:59Z',
    createdAt: '2026-07-10T12:00:00Z',
  },
];

export async function fetchAdminBanners(page = 0, size = 10): Promise<Page<AdminBanner>> {
  if (import.meta.env.DEV) {
    await new Promise((r) => setTimeout(r, 200));
    const start = page * size;
    const content = DEV_BANNERS.slice(start, start + size);
    return {
      content,
      totalElements: DEV_BANNERS.length,
      number: page,
      size,
    };
  }
  return apiClient.get<Page<AdminBanner>>(`/api/admin/banners?page=${page}&size=${size}`);
}

export async function createAdminBanner(req: CreateBannerRequest): Promise<AdminBanner> {
  if (import.meta.env.DEV) {
    await new Promise((r) => setTimeout(r, 300));
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
  return apiClient.post<AdminBanner>('/api/admin/banners', req);
}
