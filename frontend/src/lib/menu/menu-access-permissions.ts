import type { LinkProps } from '@tanstack/react-router';

export const ROLE_ROUTES: Record<string, Array<LinkProps['to']>> = {
  ADMINISTRATOR: [
    '/groups',
    '/groups/create',
    '/groups/$groupId',
    '/tables',
    '/tables/$slug',
    '/menus',
    '/menus/create',
    '/menus/$menuId',
    '/pages/$slug',
    '/profile',
    '/tables',
    '/users',
    '/users/create',
    '/users/$userId',
  ],
  MANAGER: ['/tables', '/tables/$slug', '/pages/$slug'],
  REGISTERED: ['/tables', '/tables/$slug', '/pages/$slug'],
  MASTER: [
    '/extensions',
    '/groups',
    '/groups/create',
    '/groups/$groupId',
    '/menus',
    '/menus/create',
    '/menus/$menuId',
    '/pages/$slug',
    '/profile',
    '/settings',
    '/tables',
    '/tables/$slug',
    '/users',
    '/users/create',
    '/users/$userId',
  ],
};

export const ROLE_DEFAULT_ROUTE: Record<string, LinkProps['to']> = {
  ADMINISTRATOR: '/tables',
  MANAGER: '/tables',
  REGISTERED: '/tables',
  MASTER: '/tables',
};

/**
 * Verifica se uma rota real corresponde a um padrão de rota
 * Exemplo: matchRoute('/users/123', '/users/$userId') => true
 */
function matchRoute(actualRoute: string, routePattern: string): boolean {
  const actualParts = actualRoute.split('/').filter(Boolean);
  const patternParts = routePattern.split('/').filter(Boolean);

  if (actualParts.length !== patternParts.length) {
    return false;
  }

  return patternParts.every((patternPart, index) => {
    // Se o segmento do padrão começa com $, é um parâmetro dinâmico
    if (patternPart.startsWith('$')) {
      return true;
    }
    // Caso contrário, deve corresponder exatamente
    return patternPart === actualParts[index];
  });
}

export function canAccessRoute(
  role: keyof typeof ROLE_ROUTES,
  route: string,
): boolean {
  const allowedRoutes = ROLE_ROUTES[role];

  // Verifica se a rota corresponde a algum padrão permitido
  return allowedRoutes.some((allowedRoute) => {
    // Ignora rotas undefined
    if (!allowedRoute || typeof allowedRoute !== 'string') {
      return false;
    }

    // Se a rota permitida contém parâmetros dinâmicos, usa matching pattern-based
    if (allowedRoute.includes('$')) {
      return matchRoute(route, allowedRoute);
    }
    // Caso contrário, faz comparação direta
    return route === allowedRoute;
  });
}
