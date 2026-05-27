import { z } from 'zod';

import { PRODUCT_IMAGE_MAX_COUNT } from '../../lib/constants';
import type { SellerProductDetail } from '../../types/product';

import type { SellerProductSavePayload } from './productDetailApi';

export const PRODUCT_FORM_CATEGORIES = [
  { id: 'ropa', label: 'Ropa' },
  { id: 'calzado', label: 'Calzado' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'otros', label: 'Otros' },
] as const;

export type ProductFormCategoryId = (typeof PRODUCT_FORM_CATEGORIES)[number]['id'];

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
    categoryId: PRODUCT_FORM_CATEGORIES[0].id,
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
    categoryId:
      PRODUCT_FORM_CATEGORIES.some((c) => c.id === detail.categoryId) ?
        (detail.categoryId as ProductFormCategoryId)
      : PRODUCT_FORM_CATEGORIES[0].id,
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
