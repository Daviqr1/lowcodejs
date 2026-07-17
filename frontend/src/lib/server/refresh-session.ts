import { createServerFn } from '@tanstack/react-start';

type RefreshResult = {
  ok: boolean;
  cookie: string;
};

// Renova a sessão no contexto SSR: chama o backend com os cookies recebidos,
// repassa os cookies renovados (Set-Cookie) ao browser e devolve um Cookie
// header já atualizado para reusar nas próximas requests do mesmo render.
// O interceptor do axios só renova no client; em SSR é esta função que fecha
// a lacuna que jogava o usuário para o login ao dar F5.
export const serverRefreshSession = createServerFn({ method: 'POST' }).handler(
  async (): Promise<RefreshResult> => {
    const { Env } = await import('@/env');
    const { getRequestHeader, setResponseHeader } =
      await import('@tanstack/react-start/server');

    // Mesmo host que o api.ts usa em SSR (interno no Docker), não o público.
    const baseUrl = process.env.SERVER_API_URL ?? Env.VITE_API_BASE_URL;
    const incoming = getRequestHeader('Cookie') ?? '';

    const response = await fetch(`${baseUrl}/authentication/refresh-token`, {
      method: 'POST',
      headers: { Cookie: incoming },
    });

    if (!response.ok) {
      return { ok: false, cookie: '' };
    }

    const renewedCookies = response.headers.getSetCookie();
    if (renewedCookies.length > 0) {
      // Append (não overwrite): cada Set-Cookie vira um header próprio.
      setResponseHeader('set-cookie', renewedCookies);
    }

    // Monta o Cookie das próximas requests SSR: os recebidos, sobrescritos
    // pelos renovados (accessToken/refreshToken/activeAccountId).
    const jar = new Map<string, string>();
    for (const part of incoming.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name) jar.set(name, rest.join('='));
    }
    for (const raw of renewedCookies) {
      const [pair] = raw.split(';');
      const [name, ...rest] = pair.trim().split('=');
      if (name) jar.set(name, rest.join('='));
    }

    const cookie = Array.from(jar.entries())
      .map((entry) => `${entry[0]}=${entry[1]}`)
      .join('; ');

    return { ok: true, cookie };
  },
);
