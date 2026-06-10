import { ApiError } from '../../lib/http/apiClient';

export type SellerRegistrationRequestPayload = {
  businessName: string;
  cuit: string;
  contactName: string;
  email: string;
  phone: string;
  notes?: string;
};

function devDelay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

/**
 * Envía una solicitud de registro de comercio al backend.
 * En desarrollo, simula el proceso de red.
 */
export async function submitSellerRegistrationRequest(
  data: SellerRegistrationRequestPayload,
): Promise<{ success: boolean; message: string }> {
  // Validaciones del lado del cliente antes de enviar
  if (!data.businessName.trim() || !data.cuit.trim() || !data.contactName.trim() || !data.email.trim() || !data.phone.trim()) {
    throw new ApiError(400, null, 'Por favor, completá todos los campos obligatorios.');
  }

  const cleanCuit = data.cuit.replace(/\D/g, '');
  if (cleanCuit.length !== 11) {
    throw new ApiError(400, null, 'El CUIT debe tener exactamente 11 dígitos numéricos.');
  }

  if (import.meta.env.DEV) {
    return devDelay({
      success: true,
      message: 'Tu solicitud fue recibida correctamente. Nos contactaremos pronto.',
    });
  }

  // En producción, esto apuntaría al endpoint real del backend
  // return apiClient.post('/api/landing/seller-requests', data);
  return devDelay({
    success: true,
    message: 'Tu solicitud fue recibida correctamente. Nos contactaremos pronto.',
  });
}
