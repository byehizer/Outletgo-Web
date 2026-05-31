export type ToastVariant = 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

export type ToastContextType = {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
};
