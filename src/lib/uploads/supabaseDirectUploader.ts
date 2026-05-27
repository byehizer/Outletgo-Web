import type { ImageUploadResult, ImageUploader } from './imageUploader';

/**
 * Opción A (stub Paso 11): Storage directo sin pasar por el backend.
 * Implementar cuando el contrato Supabase esté cerrado para el panel.
 */
export const supabaseDirectUploader: ImageUploader = {
  async upload(file: File): Promise<ImageUploadResult> {
    void file;
    throw new Error('Opción A (upload directo a Supabase Storage) no está implementada.');
  },
};
