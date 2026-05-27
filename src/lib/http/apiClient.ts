import { STORAGE_KEYS } from '../constants';
import { messageFromApiBody } from '../../types/api';
import { resolveApiUrl } from './buildUrl';
import { dispatchUnauthorized } from './onUnauthorized';

import type { ApiFetchInit } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function authorizeHeaders(
  headers: Headers,
  skipAuth: boolean | undefined,
  bearerToken: string | undefined,
): void {
  if (skipAuth) {
    return;
  }
  const token = bearerToken ?? localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
}

function buildHeadersWithJsonBody(
  initHeaders: HeadersInit | undefined,
  body: unknown,
): { headers: Headers; serialized: BodyInit | undefined } {
  const headers = new Headers(initHeaders);
  if (body === undefined) {
    return { headers, serialized: undefined };
  }
  if (body instanceof FormData || body instanceof URLSearchParams) {
    return { headers, serialized: body };
  }
  if (typeof body === 'string') {
    return { headers, serialized: body };
  }
  headers.set('Content-Type', 'application/json');
  return { headers, serialized: JSON.stringify(body) };
}

async function request<T>(
  path: string,
  init: ApiFetchInit & { body?: BodyInit | null },
): Promise<T> {
  const { skipAuth, bearerToken, body, ...fetchInit } = init;
  const url = resolveApiUrl(path);
  const headers = new Headers(fetchInit.headers);
  authorizeHeaders(headers, skipAuth, bearerToken);

  const response = await fetch(url, {
    ...fetchInit,
    headers,
    body,
  });

  const payload = await parseBody(response);

  if (response.status === 401) {
    dispatchUnauthorized();
    throw new ApiError(401, payload, messageFromApiBody(payload));
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload, messageFromApiBody(payload));
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, init?: ApiFetchInit) =>
    request<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body?: unknown, init?: ApiFetchInit) => {
    const { headers, serialized } = buildHeadersWithJsonBody(init?.headers, body);
    return request<T>(path, {
      ...init,
      method: 'POST',
      headers,
      body: serialized,
    });
  },

  put: <T>(path: string, body?: unknown, init?: ApiFetchInit) => {
    const { headers, serialized } = buildHeadersWithJsonBody(init?.headers, body);
    return request<T>(path, {
      ...init,
      method: 'PUT',
      headers,
      body: serialized,
    });
  },

  patch: <T>(path: string, body?: unknown, init?: ApiFetchInit) => {
    const { headers, serialized } = buildHeadersWithJsonBody(init?.headers, body);
    return request<T>(path, {
      ...init,
      method: 'PATCH',
      headers,
      body: serialized,
    });
  },

  delete: <T>(path: string, init?: ApiFetchInit) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
