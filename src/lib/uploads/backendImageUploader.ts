import { apiClient } from '../http/apiClient';

import type { ImageUploadOptions, ImageUploadResult, ImageUploader } from './imageUploader';

type JsonRecord = Record<string, unknown>;

function pickUrl(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return payload.length > 0 ? payload : null;
  }
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const o = payload as JsonRecord;
  const direct = o.url ?? o.publicUrl ?? o.public_url ?? o.imageUrl ?? o.image_url ?? o.photoUrl ?? o.photo_url;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }
  const nested = o.data ?? o.upload;
  if (typeof nested === 'object' && nested !== null) {
    const n = nested as JsonRecord;
    const nestedUrl = n.url ?? n.publicUrl ?? n.public_url ?? n.imageUrl ?? n.image_url;
    if (typeof nestedUrl === 'string' && nestedUrl.length > 0) {
      return nestedUrl;
    }
  }
  return null;
}

/**
 * Opción B: multipart al backend — campo `file`.
 * Opcional campo texto `stagingSessionId` si el servidor agrupa blobs en staging.
 */
export const backendImageUploader: ImageUploader = {
  async upload(file: File, options?: ImageUploadOptions): Promise<ImageUploadResult> {
    const body = new FormData();
    body.append('file', file);
    const stagingId = options?.stagingSessionId?.trim();
    if (stagingId) {
      body.append('stagingSessionId', stagingId);
      // Backend Spring típico: descomenta la línea que coincida con @RequestPart/@RequestParam
      // body.append('staging_session_id', stagingId);
    }

    const payload = await apiClient.post<unknown>('/api/uploads/product-image', body);
    const url = pickUrl(payload);
    if (!url) {
      throw new Error(
        'El servidor guardó la imagen pero no devolvió una URL reconocida. Coordiná shape del JSON.',
      );
    }
    return { url };
  },
};
