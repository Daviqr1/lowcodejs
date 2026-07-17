# Tools — Carregador Dinâmico (`$package/$id`)

Rota dinâmica que resolve e renderiza uma ferramenta (`type=TOOL`) específica. A
entry React vive em `frontend/extensions/<pkg>/tools/<id>/index.tsx` e é
lazy-importada em runtime. Para a listagem de tools, ver `tools/CLAUDE.md` (rota
pai).

## Rota

| Rota                  | Descrição                                  |
| --------------------- | ------------------------------------------ |
| `/tools/$package/$id` | Renderiza uma ferramenta de extensão ativa |

## Arquivos

| Arquivo              | Tipo       | Descrição                                                                                          |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `$id/index.tsx`      | Loader     | `createFileRoute` com head `Ferramenta`. `loader` faz prefetch de `extensionListOptions()` (todas) |
| `$id/index.lazy.tsx` | Componente | Lê params `$package`/`$id`, busca extensões e lazy-importa a entry da tool via `React.lazy`        |

## Fluxo

1. Usuário acessa `/tools/<pkg>/<id>` → loader pré-carrega
   `extensionListOptions()` (lista completa, para validação)
2. O componente lê os params (`Route.useParams()`) e
   `useSuspenseQuery(extensionListOptions())`
3. `React.useMemo` procura a extensão por `pkg` + `extensionId` +
   `E_EXTENSION_TYPE.TOOL`
4. Se não encontrada: retorno antecipado com `RouteNotFound`
5. Se encontrada: `React.lazy(() => loadExtensionEntry(pkg, 'tools', id))` (de
   `@/lib/extensions-registry`) carrega o componente dentro de `Suspense` com
   fallback `ToolLoadingState` (Spinner em `PageShell`). Se a entry retorna
   falsy, o fallback é `RouteNotFound`

## Convenções

- Diferença para a listagem (`tools/index.tsx`): aqui usa `extensionListOptions`
  (todas) em vez de `extensionActiveListOptions` — permite validar existência da
  tool mesmo que inativa
- Permissões: filtragem por lista de ativas + verificações internas de cada tool
  (ex.: `usePermission().can(...)`). RBAC final é responsabilidade do backend
- Mesma arquitetura do carregador de módulos em `_private/e/$package/$id`
