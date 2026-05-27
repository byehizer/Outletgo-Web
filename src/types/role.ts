/**
 * Roles alineados con el backend JWT / objeto user en localStorage.
 * Si el backend usa otros literales, mapear en un solo lugar (p. ej. auth).
 */
export const ROLES = ['ADMIN', 'SELLER', 'BUYER'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
