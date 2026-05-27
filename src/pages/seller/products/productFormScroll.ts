import {
  firstValidationErrorPath,
  smoothScrollIntoView,
  smoothScrollWindowTop,
} from '../../../lib/formScroll';

export { firstValidationErrorPath, smoothScrollIntoView, smoothScrollWindowTop };

/**
 * Ubica el control o bloque relacionado al path de react-hook-form (formulario producto).
 */
export function scrollToProductFormFieldPath(path: string | null): void {
  if (!path) {
    return;
  }
  if (path === 'imageUrls' || path.startsWith('imageUrls.')) {
    smoothScrollIntoView(document.getElementById('product-images-section'));
    return;
  }
  if (path === 'variations' || path.startsWith('variations.')) {
    const m = /^variations\.(\d+)\.(size|color|stock)$/.exec(path);
    if (m) {
      const name = `variations.${m[1]}.${m[2]}`;
      const el = document.querySelector<HTMLElement>(`[name="${name}"]`);
      if (el) {
        smoothScrollIntoView(el);
        return;
      }
    }
    smoothScrollIntoView(document.getElementById('product-variations-section'));
    return;
  }

  const idByPath: Record<string, string | undefined> = {
    name: 'product-name',
    description: 'product-desc',
    categoryId: 'product-category',
    basePrice: 'product-price',
    tags: 'product-tags',
  };
  const id = idByPath[path];
  if (id) {
    smoothScrollIntoView(document.getElementById(id));
    return;
  }
  smoothScrollIntoView(document.getElementById('product-form-general'));
}
