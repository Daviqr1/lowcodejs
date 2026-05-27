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
});

API.interceptors.request.use(async (config) => {
  config.baseURL = resolveBaseUrl();

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
];

const isAuthEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<void> | null = null;

const performRefresh = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = API.post('/authentication/refresh-token')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const handleSessionLost = (): void => {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (isPublicPath(currentPath)) return;
  useAuthStore.getState().clear();
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

    try {
      await performRefresh();
      return API.request(config);
    } catch (refreshError) {
      handleSessionLost();
      return Promise.reject(refreshError);
    }
  },
);
