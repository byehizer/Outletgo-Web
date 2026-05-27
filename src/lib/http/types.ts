/**
 * Opciones extendidas sobre fetch para el cliente HTTP interno.
 */
export type ApiFetchInit = Omit<RequestInit, 'body'> & {
  /** Sin cabecera Authorization (login, recuperar clave, health público). */
  skipAuth?: boolean;
  /**
   * Bearer explícito (p. ej. OAuth antes de persistir `outletgo_token`).
   * Para esta petición se usa este token en lugar del de localStorage.
   */
  bearerToken?: string;
};
