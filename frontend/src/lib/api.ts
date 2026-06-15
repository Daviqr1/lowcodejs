import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getServerCookies } from '@/lib/server/get-cookies';
import { useAuthStore } from '@/stores/authentication';

/**
 * Resolve a baseURL conforme o runtime:
 * - Server (Nitro/SSR dentro do container): preferir INTERNAL_API_URL
 *   (hostname interno da network, ex: http://api:3000).
 * - Browser: SEMPRE usar VITE_API_BASE_URL (que vai no bundle e aponta
 *   pra URL pública alcançável pelo user, ex: http://localhost:3000).
 *
 * Importante: NÃO usar serverFn aqui — o cliente receberia o valor
 * server-side via RPC e tentaria conectar em hostnames internos
 * inacessíveis pelo browser.
 */
function resolveBaseUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env['INTERNAL_API_URL'] ||
      process.env['VITE_API_BASE_URL'] ||
      'http://localhost:3000'
    );
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
}

export const API = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  paramsSerializer: {
    // Fastify default querystring parser nao suporta `_ids[]=A&_ids[]=B`,
    // so `_ids=A&_ids=B` (sem brackets). indexes:null deixa axios serializar
    // arrays como `key=v1&key=v2`.
    indexes: null,
  },
});

API.interceptors.request.use(async (config) => {
  config.baseURL = resolveBaseUrl();

  if (typeof window !== 'undefined') {
    const activeAccountId = useAuthStore.getState().activeAccountId;
    if (activeAccountId) {
      config.headers.set('X-Auth-Account-Id', activeAccountId);
    }
  }

  if (typeof window === 'undefined') {
    try {
      const cookies = await getServerCookies();
      if (cookies) config.headers.set('Cookie', cookies);
    } catch {
      /* not in request context */
    }
  }

  return config;
});

const isPublicPath = (path: string): boolean =>
  path === '/' ||
  path === '/sign-up' ||
  path.startsWith('/forgot-password') ||
  path.startsWith('/tables/');

const AUTH_ENDPOINTS = [
  '/authentication/sign-in',
  '/authentication/sign-up',
  '/authentication/sign-out',
  '/authentication/refresh-token',
  '/authentication/accounts',
  '/authentication/switch-account',
];

const isAuthEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const refreshPromises = new Map<string, Promise<void>>();

const performRefresh = (accountId: string | null): Promise<void> => {
  const refreshKey = accountId ?? 'legacy';
  const existingPromise = refreshPromises.get(refreshKey);
  if (existingPromise) return existingPromise;

  const refreshPromise = API.post('/authentication/refresh-token', undefined, {
    headers: accountId ? { 'X-Auth-Account-Id': accountId } : undefined,
  })
    .then(() => undefined)
    .finally(() => {
      refreshPromises.delete(refreshKey);
    });

  refreshPromises.set(refreshKey, refreshPromise);
  return refreshPromise;
};

const handleSessionLost = (): void => {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (isPublicPath(currentPath)) return;
  const activeAccountId = useAuthStore.getState().activeAccountId;
  if (activeAccountId) {
    useAuthStore.getState().removeAccount(activeAccountId);
  } else {
    useAuthStore.getState().clear();
  }
  window.location.href = '/';
};

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;

    if (status !== 401 || !config) {
      return Promise.reject(error);
    }

    if (
      typeof window === 'undefined' ||
      isAuthEndpoint(config.url) ||
      config._retried
    ) {
      if (typeof window !== 'undefined' && !isAuthEndpoint(config.url)) {
        handleSessionLost();
      }
      return Promise.reject(error);
    }

    config._retried = true;
    const activeAccountId = useAuthStore.getState().activeAccountId;

    try {
      await performRefresh(activeAccountId);
      return API.request(config);
    } catch (refreshError) {
      handleSessionLost();
      return Promise.reject(refreshError);
    }
  },
);
