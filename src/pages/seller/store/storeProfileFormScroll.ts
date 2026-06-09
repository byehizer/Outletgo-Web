import { smoothScrollIntoView } from '../../../lib/formScroll';

const SOCIAL_FIELD_IDS: Record<string, string | undefined> = {
  instagram: 'store-social-instagram',
  facebook: 'store-social-facebook',
  tiktok: 'store-social-tiktok',
  website: 'store-social-website',
};

/**
 * Enfoca en la sección/campo del perfil de tienda para un path de errores de react-hook-form.
 */
export function scrollToStoreProfileFieldPath(path: string | null): void {
  if (!path) {
    return;
  }

  if (path === 'logoUrl' || path.startsWith('logoUrl.')) {
    smoothScrollIntoView(document.getElementById('store-section-logo'));
    return;
  }

  if (path === 'social') {
    smoothScrollIntoView(document.getElementById('store-section-social'));
    return;
  }
  const socialMatch = /^social\.([^.]+)/.exec(path);
  if (socialMatch) {
    const key = socialMatch[1];
    const elId =
      key !== undefined ? SOCIAL_FIELD_IDS[key] ?? 'store-section-social' : 'store-section-social';
    smoothScrollIntoView(document.getElementById(elId));
    return;
  }

  const bh = /^businessHours(?:\.(\d+))?/.exec(path);
  if (bh) {
    const idx = bh[1];
    if (idx !== undefined) {
      smoothScrollIntoView(document.getElementById(`store-hours-row-${idx}`));
      return;
    }
    smoothScrollIntoView(document.getElementById('store-section-business-hours'));
    return;
  }

  const top = path.split('.')[0] ?? path;
  const idByField: Record<string, string> = {
    name: 'store-field-name',
    taxIdCuit: 'store-field-cuit',
    streetAddress: 'store-field-address',
    phone: 'store-field-phone',
  };
  const id = idByField[top];
  if (id) {
    smoothScrollIntoView(document.getElementById(id));
    return;
  }

  smoothScrollIntoView(document.getElementById('store-section-general'));
}
