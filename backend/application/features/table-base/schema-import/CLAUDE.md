# Schema Import

Operação multi-tabela: cria várias tabelas de uma vez a partir de um schema YAML
declarativo. Inspirado no fluxo do Supabase (cola e executa).

## Endpoint

`POST /tables/schema-import`

| Item | Valor |
|------|-------|
| Auth | Obrigatório (`AuthenticationMiddleware`) |
| Permissão | `CREATE_TABLE` (`TableAccessMiddleware`) |
| Body limit | 5 MB |
| Body | `{ yaml: string }` |
| Resposta 201 | `{ created: Array<{ name, slug, fieldCount }>, errors: Array<{ name, message }> }` |

## Fluxo (2 passes)

1. Parse YAML com `js-yaml` (FAILSAFE_SCHEMA) → coerção de primitivos
   (string `"true"/"false"`/números) → validação Zod via
   `SchemaImportPayloadValidator`
2. **Pass 1** — para cada tabela:
   - Slugify do nome
   - Checa duplicação no batch e no DB
   - Cria native fields + user fields (RELATIONSHIP cria com `relationship=null`,
     registra em `pendingRelationships`)
   - Cria a tabela com fieldOrder defaults
   - Registra `tableRef` (com `fieldsBySlug` Map) em `batchTables`
3. **Pass 2** — para cada relationship pendente:
   - Tenta resolver via `batchTables` (mesmo schema)
   - Fallback: `tableRepository.findBySlug` (referência a tabela já existente)
   - Atualiza `field.relationship` ou reporta erro

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 400 | OWNER_REQUIRED | `ownerId` ausente (não deveria com auth) |
| 400 | INVALID_YAML | YAML malformado |
| 400 | INVALID_SCHEMA | Estrutura não bate com `SchemaImportPayloadValidator` |
| 500 | SCHEMA_IMPORT_ERROR | Erro interno |

## Escopo v1

- Tipos: `TEXT_SHORT`, `TEXT_LONG`, `DATE`, `DROPDOWN`, `FILE`, `USER`,
  `CATEGORY`, `RELATIONSHIP`
- Propriedades de campo: `required`, `multiple`, `format`, `showInList`/
  `showInForm`/`showInDetail`/`showInFilter`, `defaultValue`, `options` (para
  DROPDOWN), `relationship` (para RELATIONSHIP). Os booleans `showInList`/
  `showInForm`/`showInDetail` sao input do formato de importacao e sao
  convertidos para `field.permissions` (`buildFieldPermissions`); nao existem na
  entidade. `showInFilter` e gravado direto no campo.
- Propriedades de tabela: `name`, `style`
- Limites: 100 tabelas por schema, 100 campos por tabela, body 5 MB

Fora do escopo (v2):
- `FIELD_GROUP` (grupos embutidos)
- `methods` (beforeSave / afterSave / onLoad)
- Importação de dados (linhas) — feature separada do `tables-import-export`

## Estratégia de erro

"Execute tudo, reporta no final" (Supabase-like). Erros são isolados por tabela
e por relationship — uma tabela com erro não bloqueia as outras. Não existe
rollback (MongoDB sem transactions cross-collection facilita isso).

## Testes

- Unit: `schema-import.use-case.spec.ts` (11 testes, in-memory repositórios)
- E2E: `schema-import.controller.spec.ts` (MongoDB real, supertest)
