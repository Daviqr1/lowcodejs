# Layout de Rotas Publicas de Autenticacao

Layout wrapper para rotas publicas de autenticacao (login, cadastro). Usuarios
ja autenticados sao redirecionados automaticamente.

## Estrutura

```
_authentication/
  layout.tsx          # Layout com guard de redirecionamento
  _sign-in/           # Rota pathless (renderiza em /)
    index.tsx
    index.lazy.tsx
  sign-up/            # Rota /sign-up
    index.tsx
    index.lazy.tsx
    success/          # Rota /sign-up/success (confirmacao de cadastro)
  forgot-password/    # Rota /forgot-password (solicitar recuperacao)
    index.tsx
    index.lazy.tsx
    validate-code/    # Rota /forgot-password/validate-code
    reset-password/   # Rota /forgot-password/reset-password
```

## Guard de Layout

O `beforeLoad` em `layout.tsx` roda antes de qualquer rota publica, em ordem:

1. **reset-password**: `/forgot-password/reset-password` pula o guard (o fluxo
   de reset roda mesmo "deslogado").
2. **Setup incompleto**: busca `setupStatusOptions()`; se `!completed`,
   redireciona para `/setup/{currentStep}` (fallback `admin`).
3. **addAccount**: se houver o search param `addAccount`, pula o guard (permite
   logar em outra conta mesmo ja autenticado).
4. **Sessao ativa**: carrega o perfil via `profileDetailOptions()`. Se houver
   usuario:
   - `role = user.group?.slug?.toUpperCase() ?? 'REGISTERED'`;
     `fallbackRoute = ROLE_DEFAULT_ROUTE[role] ?? '/tables'`
   - busca os menus (`menuAllOptions()`) e usa `resolveInitialMenuRoute(menus)`:
     rota externa → `redirect({ href })`; interna → `redirect({ to })`; ausente
     → `fallbackRoute`

## Tabela de Rotas

| Diretorio                         | Path                              | Descricao                        |
| --------------------------------- | --------------------------------- | -------------------------------- |
| `_sign-in/`                       | `/` (pathless, rota raiz)         | Pagina de login                  |
| `sign-up/`                        | `/sign-up`                        | Pagina de cadastro               |
| `sign-up/success/`                | `/sign-up/success`                | Confirmacao de conta criada      |
| `forgot-password/`                | `/forgot-password`                | Solicitar recuperacao de senha   |
| `forgot-password/validate-code/`  | `/forgot-password/validate-code`  | Validar codigo enviado por email |
| `forgot-password/reset-password/` | `/forgot-password/reset-password` | Definir nova senha               |

## Padrao de Arquivos

Cada rota segue a convencao TanStack Router:

| Arquivo          | Responsabilidade                                    |
| ---------------- | --------------------------------------------------- |
| `index.tsx`      | Configuracao da rota (head/SEO, loader, beforeLoad) |
| `index.lazy.tsx` | Componente UI (carregado via lazy loading)          |

## Dependencias Chave

- `ROLE_DEFAULT_ROUTE` de `@/lib/menu/menu-access-permissions` - mapa role ->
  rota padrao
- `resolveInitialMenuRoute` de `@/lib/menu/initial-menu-route` - primeira rota
  navegavel a partir dos menus do usuario
- `profileDetailOptions`, `setupStatusOptions`, `menuAllOptions` de
  `@/hooks/tanstack-query/_query-options` - perfil, status do setup e menus
