import { z } from 'zod';

import { PRODUCT_IMAGE_MAX_COUNT } from '../../lib/constants';
import type { SellerProductDetail } from '../../types/product';

import type { SellerProductSavePayload } from './productDetailApi';

/**
 * Categorías estáticas de fallback — se usan si el backend no responde.
 * Los IDs son los UUIDs reales de la tabla `categories` en Supabase/PostgreSQL.
 */
export const PRODUCT_FORM_CATEGORIES_FALLBACK: { id: string; label: string }[] = [
  { id: '020edddc-61a1-4038-ba32-40a0dcee1dbf', label: 'Ropa' },
  { id: '4a04d538-4228-4efc-8b89-322ea1f6186b', label: 'Calzado' },
  { id: 'e3f3eb7a-59f0-4d65-aff9-3d48531a853b', label: 'Abrigos' },
  { id: '9e1ba1e7-caf1-4b54-9973-111bdcd337ad', label: 'Accesorios' },
];

/**
 * @deprecated Usar `PRODUCT_FORM_CATEGORIES_FALLBACK` o las categorías dinámicas cargadas desde el backend.
 */
export const PRODUCT_FORM_CATEGORIES = PRODUCT_FORM_CATEGORIES_FALLBACK;

export type ProductFormCategoryId = string;

export const variationRowSchema = z.object({
  size: z.string().min(1, 'Indicá el talle o medida.'),
  color: z.string().min(1, 'Indicá el color.'),
  stock: z.coerce.number().int('Stock debe ser entero.').min(1, 'Stock mínimo 1.'),
});

export const productFormSchema = z.object({
  name: z.string().min(2, 'El nombre es demasiado corto.'),
  description: z.string().min(10, 'Describe el producto en al menos 10 caracteres.'),
  categoryId: z.string().min(1, 'Elegí una categoría.'),
  tags: z.string(),
  basePrice: z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'El precio debe ser mayor a 0.'),
  imageUrls: z
    .array(z.string().min(4, 'URL de imagen inválida'))
    .min(1, 'Agregá al menos una imagen.')
    .max(PRODUCT_IMAGE_MAX_COUNT, `Hasta ${PRODUCT_IMAGE_MAX_COUNT} fotos.`),
  variations: z.array(variationRowSchema).min(1, 'Agregá al menos una variación.'),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export type VariationRowValues = z.infer<typeof variationRowSchema>;

export function productFormDefaults(): ProductFormValues {
  return {
    name: '',
    description: '',
    categoryId: PRODUCT_FORM_CATEGORIES[0]?.id ?? '',
    tags: '',
    basePrice: 0,
    imageUrls: [],
    variations: [{ size: '', color: '', stock: 1 }],
  };
}

export function detailToFormValues(detail: SellerProductDetail): ProductFormValues {
  const variations =
    detail.variations.length > 0
      ? detail.variations.map((v) => ({
          size: v.size,
          color: v.color,
          stock: v.stock < 1 ? 1 : v.stock,
        }))
      : productFormDefaults().variations;

  return {
    name: detail.name,
    description: detail.description,
    categoryId: detail.categoryId || (PRODUCT_FORM_CATEGORIES[0]?.id ?? ''),
    tags: detail.tags.join(', '),
    basePrice: detail.basePrice,
    imageUrls: [...detail.imageUrls],
    variations,
  };
}

export function productFormValuesToSavePayload(
  values: ProductFormValues,
  stagingSessionId?: string,
): SellerProductSavePayload {
  const tags = values.tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId,
    tags,
    basePrice: values.basePrice,
    imageUrls: values.imageUrls,
    variations: values.variations.map((v) => ({
      size: v.size.trim(),
      color: v.color.trim(),
      stock: Math.floor(v.stock),
    })),
    stagingSessionId,
  };
}
