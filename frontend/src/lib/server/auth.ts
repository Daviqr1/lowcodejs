import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const serverSignIn = createServerFn({ method: 'POST' })
  .inputValidator(signInSchema)
  .handler(async ({ data }) => {
    const { Env } = await import('@/env');
    const baseUrl = process.env['INTERNAL_API_URL'] || Env.VITE_API_BASE_URL;
    const res = await fetch(`${baseUrl}/authentication/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Falha na autenticacao');
    }
    const cookieHeader = res.headers.get('set-cookie') ?? '';
    const profileRes = await fetch(`${baseUrl}/profile`, {
      headers: { Cookie: cookieHeader },
    });
    if (!profileRes.ok) {
      throw new Error('Falha ao carregar perfil');
    }
    return profileRes.json();
  });

export const serverSignOut = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { Env } = await import('@/env');
    const baseUrl = process.env['INTERNAL_API_URL'] || Env.VITE_API_BASE_URL;
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    const cookies = getRequestHeader('Cookie') ?? '';
    await fetch(`${baseUrl}/authentication/sign-out`, {
      method: 'POST',
      headers: { Cookie: cookies },
    });
  },
);
