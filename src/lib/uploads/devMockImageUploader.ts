import type { ImageUploadOptions, ImageUploadResult, ImageUploader } from './imageUploader';

/**
 * Sin backend: simula la subida y devuelve una URL local (`blob:`) para poder
 * probar el formulario (Paso 13) sin `/api/uploads/product-image`.
 */
export const devMockImageUploader: ImageUploader = {
  async upload(file: File, _options?: ImageUploadOptions): Promise<ImageUploadResult> {
    void _options;
    await new Promise((r) => window.setTimeout(r, 280));
    return { url: URL.createObjectURL(file) };
  },
};
