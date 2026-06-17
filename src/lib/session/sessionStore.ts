import { STORAGE_KEYS } from '../constants';
import type { User } from '../../types/user';
import { isRole } from '../../types/role';

function parseStoredUser(raw: string): User | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const r = parsed as Record<string, unknown>;
    const id = r.id;
    const email = r.email;
    const role = r.role;
    const name = r.name;
    const storeId = r.storeId;
    const avatarUrl = r.avatarUrl;
    const isActive = r.isActive;

    if (typeof id !== 'string' || typeof email !== 'string' || typeof name !== 'string') {
      return null;
    }

    let mappedRole = role;
    if (mappedRole === 'OUTLET_OWNER') {
      mappedRole = 'SELLER';
    } else if (mappedRole === 'CLIENT') {
      mappedRole = 'BUYER';
    }

    if (typeof mappedRole !== 'string' || !isRole(mappedRole)) {
      return null;
    }
    if (typeof isActive !== 'boolean') {
      return null;
    }
    const normalizedStoreId = typeof storeId === 'string' ? storeId : null;
    const normalizedAvatar = typeof avatarUrl === 'string' ? avatarUrl : null;

    return {
      id,
      email,
      role: mappedRole,
      name,
      storeId: normalizedStoreId,
      avatarUrl: normalizedAvatar,
      isActive,
    };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) {
    return null;
  }
  return parseStoredUser(raw);
}

/**
 * Lee token + usuario desde localStorage. Si hay datos incompletos o corruptos,
 * limpia todo para evitar estados medios (ej. token viejo sin JSON válido).
 */
export function loadStoredSession(): { token: string | null; user: User | null } {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const rawUser = localStorage.getItem(STORAGE_KEYS.USER);

  if (!token && !rawUser) {
    return { token: null, user: null };
  }

  const user = rawUser !== null ? parseStoredUser(rawUser) : null;

  if (!token || !user) {
    clearSession();
    return { token: null, user: null };
  }

  return { token, user };
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}
