# Relationship Service

Motor do relacional entre tabelas: cardinalidade, vinculo (link/unlink),
materializacao de campos-espelho e politicas de delete. Fonte de verdade sao a
`RelationshipDefinition` + os `RelationshipLink` (ver
`repositories/relationship-definition|relationship-link` e a spec §9/§10).

## Arquivos

| Arquivo | Classe | Responsabilidade |
|---------|--------|------------------|
| `relationship-contract.service.ts` / `relationship.service.ts` | `RelationshipService` | Cardinalidade + vinculos + resolucao |
| `relationship-materialization-contract.service.ts` / `.service.ts` | `RelationshipMaterializationService` | Materializa def + campo-espelho a partir do campo source; `syncConfig` |
| `relationship-deletion-contract.service.ts` / `.service.ts` | `RelationshipDeletionService` | Aplica `onDelete` (CASCADE/SET_NULL/RESTRICT) e limpa vinculos ao apagar tabela |
| `*.spec.ts` | — | Unit tests de cada servico |

## Contrato principal (`RelationshipService`)

```typescript
cardinalityOf(...) / isPivot(def) / storageRoleOf(...) / roleOfField(...)
ownerOf(...)
canLink(...) / link(...) / unlink(linkId)
ensureUnlinkKeepsRequired(...)
resolveLinkedIds(...) / resolveLinkedIdsBatch(...) / resolveOwningIds(...)
replaceLinks(...)
```

- `canLink`/`link` aplicam as regras de cardinalidade antes de criar o
  `RelationshipLink` (idempotente via `exists`).
- `resolveLinkedIdsBatch` sustenta a hidratacao N:N sem N+1.
- `RelationshipMaterialization` roda na criacao/edicao de campo RELATIONSHIP;
  `RelationshipDeletion` roda no delete de row/tabela.

DI: cada par contract↔impl registrado pelo scanner. Consumido pelos use-cases de
`relationships/*` e por `row.repository` (populate/hidratacao).
