import type { Role } from './role';

/** Usuario devuelto por el backend tras login; el rol se lee desde aquí, no del JWT. */
export type User = {
  id: string;
  email: string;
  role: Role;
  name: string;
  /** Tienda asociada; null para ADMIN o hasta que exista tienda. */
  storeId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};
