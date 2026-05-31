import { apiClient } from '../http/apiClient';

import type { ImageUploadOptions, ImageUploadResult, ImageUploader } from './imageUploader';

/** DTO estricto de respuesta del backend para subida de imágenes. */
type ImageUploadResponse = {
  url: string;
};

function isImageUploadResponse(payload: unknown): payload is ImageUploadResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as ImageUploadResponse).url === 'string' &&
    (payload as ImageUploadResponse).url.length > 0
  );
}

/**
 * Opción B: multipart al backend — campo `file` (@RequestPart).
 * `stagingSessionId` opcional como @RequestParam(required = false) en Spring.
 * Respuesta estricta: `{ url: string }`.
 */
export const backendImageUploader: ImageUploader = {
  async upload(file: File, options?: ImageUploadOptions): Promise<ImageUploadResult> {
    const body = new FormData();
    body.append('file', file);
    const stagingId = options?.stagingSessionId?.trim();
    if (stagingId) {
      body.append('stagingSessionId', stagingId);
    }

    const payload = await apiClient.post<unknown>('/api/uploads/product-image', body);
    if (!isImageUploadResponse(payload)) {
      throw new Error(
        'El servidor no devolvió `{ url: string }` tras subir la imagen.',
      );
    }
    return { url: payload.url };
  },
};
