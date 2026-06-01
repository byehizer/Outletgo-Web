import type { ProductStatus } from './product';

export const REPORT_STATUS = {
  PENDING: 'PENDING',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const REPORT_RESOLUTION_TYPE = {
  DISABLED: 'DISABLED',
  WARNED: 'WARNED',
  DISMISSED: 'DISMISSED',
} as const;

export type ReportResolutionType =
  (typeof REPORT_RESOLUTION_TYPE)[keyof typeof REPORT_RESOLUTION_TYPE];

export type ReportReporter = {
  id: string;
  displayName: string | null;
  email: string;
};

export type ProductReport = {
  id: string;
  reason: string;
  status: ReportStatus;
  /** null cuando status es PENDING */
  resolutionType: ReportResolutionType | null;
  createdAt: string;
  /** FK explícita al producto reportado. */
  productId: string;
  /** FK explícita a la tienda del producto. */
  storeId: string;
  reporter: ReportReporter;
  product: {
    id: string;
    name: string;
    currentStatus: ProductStatus;
    store: { id: string; businessName: string };
  };
};

export type StoreReport = {
  id: string;
  reason: string;
  status: ReportStatus;
  /** null cuando status es PENDING */
  resolutionType: ReportResolutionType | null;
  createdAt: string;
  /** FK explícita a la tienda reportada. */
  storeId: string;
  reporter: ReportReporter;
  store: {
    id: string;
    businessName: string;
    isActive: boolean;
  };
};

export type DismissReportDTO = {
  reason: string;
};

export type DisableReportedStoreDTO = {
  reason: string;
};

export type WarnSellerDTO = {
  message: string;
};

export type ReportType = 'PRODUCT' | 'STORE';
