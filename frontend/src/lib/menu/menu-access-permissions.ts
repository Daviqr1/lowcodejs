import type { LinkProps } from '@tanstack/react-router';

import { E_AREA_CAPABILITY } from '@/lib/constant';

// Rotas das areas do sistema -> capacidade exigida. Espelha o enforcement do
// backend (PermissionMiddleware por capability). Rotas ausentes deste mapa nao
// exigem capacidade (basta estar autenticado).
export const AREA_CAPABILITY_BY_ROUTE: Record<string, string> = {
  '/users': E_AREA_CAPABILITY.MANAGE_USERS,
  '/groups': E_AREA_CAPABILITY.MANAGE_USER_GROUPS,
  '/menus': E_AREA_CAPABILITY.MANAGE_MENU,
  '/settings': E_AREA_CAPABILITY.MANAGE_SETTINGS,
  '/tools': E_AREA_CAPABILITY.MANAGE_TOOLS,
  '/extensions': E_AREA_CAPABILITY.MANAGE_TOOLS,
};

// Rota padrao apos login. Mantida por slug de role para o fluxo de autenticacao;
// hoje todas apontam para /tables.
export const ROLE_DEFAULT_ROUTE: Record<string, LinkProps['to']> = {
  MASTER: '/tables',
  ADMINISTRATOR: '/tables',
  MANAGER: '/tables',
  REGISTERED: '/tables',
};

export function hasAreaCapability(
  capabilities: Array<string> | undefined,
  capability: string,
): boolean {
  if (!capabilities) return false;
  return capabilities.includes(capability);
}

// Capacidade exigida por uma rota concreta (match exato ou por prefixo de
// segmento, ex.: '/users/123' herda a regra de '/users'). Retorna null quando a
// rota nao exige capacidade.
function requiredCapabilityForRoute(route: string): string | null {
  for (const pattern of Object.keys(AREA_CAPABILITY_BY_ROUTE)) {
    if (route === pattern) return AREA_CAPABILITY_BY_ROUTE[pattern];
    if (route.startsWith(`${pattern}/`))
      return AREA_CAPABILITY_BY_ROUTE[pattern];
  }
  return null;
}

// Acesso de navegacao por capacidade (nao por role legado). O backend continua
// sendo a fonte de verdade; isto e o hint client-side da sidebar/guards.
export function canAccessRoute(
  capabilities: Array<string> | undefined,
  route: string,
): boolean {
  const required = requiredCapabilityForRoute(route);
  if (!required) return true;
  return hasAreaCapability(capabilities, required);
}
