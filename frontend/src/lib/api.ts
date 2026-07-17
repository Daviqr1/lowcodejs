import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getApiBaseUrl } from '@/lib/get-api-config';
import type { Merge } from '@/lib/interfaces';
import { getServerCookies } from '@/lib/server/get-cookies';
import { useAuthStore } from '@/stores/authentication';

let resolvedBaseUrl: string | null = null;
let baseUrlPromise: Promise<string> | null = null;

const ACTIVE_ACCOUNT_COOKIE = 'activeAccountId';

// Conta ativa lida do cookie `activeAccountId` (httpOnly:false, legível por JS).
// Usado só para, ao perder a sessão, decidir entre remover a conta ativa do
// store ou limpar tudo. A resolução do token no backend é pelo cookie
// `accessToken` fixo — não há mais header X-Auth-Account-Id.
function readActiveAccountCookie(): string | null {
  if (typeof document === 'undefined') return null;

  for (const part of document.cookie.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === ACTIVE_ACCOUNT_COOKIE) {
      const value = rest.join('=').trim();
      if (value) return decodeURIComponent(value);
    }
  }

  return null;
}

export const API = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(async (config) => {
  if (!resolvedBaseUrl) {
    if (!baseUrlPromise) {
      if (typeof window === 'undefined' && process.env.SERVER_API_URL) {
        baseUrlPromise = Promise.resolve(process.env.SERVER_API_URL);
      } else {
        baseUrlPromise = getApiBaseUrl();
      }
    }
    resolvedBaseUrl = await baseUrlPromise;
  }
  config.baseURL = resolvedBaseUrl;

  // Em SSR injeta os cookies do request — exceto quando a chamada já trouxe um
  // Cookie explícito (ex.: retry pós-refresh no beforeLoad com os cookies novos).
  if (typeof window === 'undefined' && !config.headers.has('Cookie')) {
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

type RetriableConfig = Merge<
  InternalAxiosRequestConfig,
  { _retried?: boolean }
>;

let refreshPromise: Promise<void> | null = null;

const performRefresh = (): Promise<void> => {
  if (refreshPromise) return refreshPromise;

  const run = async (): Promise<void> => {
    try {
      await API.post('/authentication/refresh-token');
    } finally {
      refreshPromise = null;
    }
  };

  refreshPromise = run();

  return refreshPromise;
};

const handleSessionLost = (): void => {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (isPublicPath(currentPath)) return;
  const activeAccountId =
    readActiveAccountCookie() ?? useAuthStore.getState().activeAccountId;
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
    const config: RetriableConfig | undefined = error.config;

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
