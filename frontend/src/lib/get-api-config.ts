import { createServerFn } from '@tanstack/react-start';

/**
 * URL base PÚBLICA da API — sempre a que o browser do usuário alcança
 * (ex: http://localhost:3000). Usada em meta tags OG e como fallback do
 * axios client.
 *
 * NÃO retornar URLs internas de network (api:3000) aqui — server fns
 * são executadas no server mas o RESULTADO viaja pro client. Pra fetches
 * server-side internos (root.tsx getSystemSettings, auth.ts, axios SSR
 * em api.ts), ler `process.env['INTERNAL_API_URL']` diretamente.
 */
export const getApiBaseUrl = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { Env } = await import('@/env');
    return Env.VITE_API_BASE_URL;
  },
);

export const getAppBaseUrl = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { Env } = await import('@/env');
    return Env.SERVER_URL || 'http://localhost:5173';
  },
);
