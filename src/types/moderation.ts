export const REPORT_STATUS = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const REFERENCE_TYPE = {
  STORE: 'STORE',
  PRODUCT: 'PRODUCT',
} as const;

export type ReferenceType = (typeof REFERENCE_TYPE)[keyof typeof REFERENCE_TYPE];
