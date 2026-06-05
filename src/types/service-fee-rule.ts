export const FEE_TARGET = {
  BUYER_SHIPPING: 'BUYER_SHIPPING',
  BUYER_ORDER: 'BUYER_ORDER',
  SELLER_COMMISSION: 'SELLER_COMMISSION',
} as const;

export type FeeTarget = (typeof FEE_TARGET)[keyof typeof FEE_TARGET];

export const FEE_TYPE = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const;

export type FeeType = (typeof FEE_TYPE)[keyof typeof FEE_TYPE];

export type ServiceFeeRule = {
  id: string;
  name: string;
  feeType: FeeType;
  feeValue: number;
  feeTarget: FeeTarget;
  shippingMethod: 'RETIRO_EN_PUNTO' | 'ENVIO_CORREO' | null;
  minOrderAmount: number;
  isActive: boolean;
  validFrom: string | null; // ISO Date string
  validUntil: string | null; // ISO Date string
  priority: number;
};

export type ServiceFeeRuleSavePayload = Omit<ServiceFeeRule, 'id'>;
