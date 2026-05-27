/** Resultado esperado después de persistir una imagen (backend u otro proveedor). */
export type ImageUploadResult = {
  url: string;
};

/**
 * Opciones por request (staging en backend antes de confirmar producto → evita blobs huérfanos).
 */
export type ImageUploadOptions = {
  /**
   * ID de sesión staging devuelta por tu API al crear borrador/sesión.
   * Va como parte del `multipart`; el campo por defecto en `backendImageUploader` es `stagingSessionId`.
   */
  stagingSessionId?: string;
};

/**
 * Estrategia pluggable Paso 11: Opción B (backend multipart) como default en `backendImageUploader`.
 */
export interface ImageUploader {
  upload(file: File, options?: ImageUploadOptions): Promise<ImageUploadResult>;
}
