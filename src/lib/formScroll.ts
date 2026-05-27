import type { FieldErrors, FieldValues } from 'react-hook-form';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function smoothScrollIntoView(
  el: Element | null | undefined,
  block: ScrollLogicalPosition = 'center',
): void {
  if (!el) {
    return;
  }
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block,
  });
}

export function smoothScrollWindowTop(): void {
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

function isFieldLeaf(node: unknown): node is { message: string } {
  return (
    typeof node === 'object' &&
    node !== null &&
    'message' in node &&
    typeof (node as { message: unknown }).message === 'string' &&
    (node as { message: string }).message.length > 0
  );
}

/**
 * Primer path de error de react-hook-form (p. ej. `name`, `variations.0.size`, `imageUrls`).
 */
export function firstValidationErrorPath(errors: FieldErrors<FieldValues>): string | null {
  const walk = (node: unknown, path: string): string | null => {
    if (!node || typeof node !== 'object') {
      return null;
    }
    if (isFieldLeaf(node)) {
      return path || null;
    }
    for (const key of Object.keys(node as Record<string, unknown>)) {
      if (key === 'ref') {
        continue;
      }
      const child = (node as Record<string, unknown>)[key];
      const nextPath = path ? `${path}.${key}` : key;
      const found = walk(child, nextPath);
      if (found) {
        return found;
      }
    }
    return null;
  };
  return walk(errors, '');
}
