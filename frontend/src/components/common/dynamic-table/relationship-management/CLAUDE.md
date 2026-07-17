# Relationship Management

Gerenciamento dos registros vinculados por um campo de relacionamento
(`E_FIELD_TYPE.RELATIONSHIP`). Permite listar, criar, editar, vincular e
desvincular linhas relacionadas a partir do registro atual, respeitando o lado
do vinculo (source/target) e a cardinalidade (single/multi).

## Arquivos

| Arquivo                                  | Componente / Export                                      | Descricao                                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `relationship-rows-inline.tsx`           | `RelationshipRowsInline` + `otherIdOf`, `isSingleLocked` | Editor inline principal: lista os vinculos, cria/edita item, seleciona existente e desvincula. Helpers puros resolvem o id do outro lado do vinculo e o bloqueio em relacionamento single. |
| `relationship-rows-data-table.tsx`       | `RelationshipRowsDataTable`                              | Variante em tabela dos registros relacionados; abre `RelationshipItemSheet` (criar/editar) e `RelationshipSelectExistingSheet` (vincular existente).                                       |
| `relationship-item-sheet.tsx`            | `RelationshipItemSheet`                                  | Sheet lateral com formulario (`useAppForm`) para criar/editar um registro da tabela relacionada.                                                                                           |
| `relationship-select-existing-sheet.tsx` | `RelationshipSelectExistingSheet`                        | Sheet lateral para buscar e selecionar registros existentes a vincular (busca paginada).                                                                                                   |
| `relationship-rows-inline.spec.tsx`      | -                                                        | Testes unitarios (vitest) de `otherIdOf` e `isSingleLocked`.                                                                                                                               |

## Dependencias principais

- `@tanstack/react-query` (useQuery/useMutation/useQueryClient) para CRUD e
  vinculos dos registros relacionados
- `@/integrations/tanstack-form/form-hook` (`useAppForm`) no item-sheet
- `@/components/ui/sheet` para os paineis laterais
- Tipo `IRelationshipLink` de `@/lib/interfaces` (vinculo source/target)

## Padroes importantes

- **Lado do vinculo**: `otherIdOf(link, currentId)` resolve o id do registro do
  outro lado — a partir do source chega no target e vice-versa
- **Cardinalidade**: `isSingleLocked(...)` bloqueia novos vinculos quando o
  relacionamento e single e ja existe um vinculo
- Render props de formulario do TanStack Form usam `(field: any)` (limitacao de
  tipagem da lib para campos dinamicos)
- UI em PT-BR
