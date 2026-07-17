# Módulos (e/)

Carregador dinâmico de extensões do tipo `MODULE`. A rota `/e/$package/$id`
resolve e lazy-importa a entry React do módulo a partir do bundle de extensões
(`frontend/extensions/<pkg>/modules/<id>/index.tsx`). O prefixo `e` significa
_extension_.

## Rota

| Rota              | Descrição                             |
| ----------------- | ------------------------------------- |
| `/e/$package/$id` | Renderiza um módulo de extensão ativo |

## Arquivos

| Arquivo                       | Tipo       | Descrição                                                                                                    |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `$package/$id/index.tsx`      | Loader     | `createFileRoute` com head `Módulo`. `loader` faz prefetch de `extensionActiveListOptions()`                 |
| `$package/$id/index.lazy.tsx` | Componente | Resolve o módulo: lê params `$package`/`$id`, busca extensões ativas e lazy-importa a entry via `React.lazy` |

## Fluxo

1. Usuário acessa `/e/<pkg>/<id>` → loader pré-carrega a lista de extensões
   ativas
2. O componente lê os params (`Route.useParams()`) e
   `useSuspenseQuery(extensionActiveListOptions())`
3. `React.useMemo` procura a extensão correspondente por `pkg` + `extensionId` +
   `E_EXTENSION_TYPE.MODULE`
4. Se encontrada: `loadExtensionEntry(pkg, 'modules', id)` (de
   `@/lib/extensions-registry`) carrega o componente dentro de `Suspense` com
   fallback `ModuleLoadingState` (Spinner em `PageShell`)
5. Se a extensão não está ativa, não existe ou a entry não carrega:
   `RouteNotFound`

## Convenções

- Mesma arquitetura de `tools/$package/$id`, porém para `MODULE` em vez de
  `TOOL` (usa `extensionActiveListOptions` no lugar de `extensionListOptions`)
- Sem checagem de permissão na rota; a autenticação é garantida pelo
  `_private/layout.tsx` e o backend filtra extensões ativas. Cada módulo aplica
  suas próprias verificações internas
- Quando há módulos ativos, eles entram na sidebar via `useMenuDynamic`
