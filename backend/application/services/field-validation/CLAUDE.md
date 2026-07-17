# Field Validation Service

Service DI que executa as regras configuradas em `field.validations[]` (camada
única de validação — ver `core/validations/CLAUDE.md`). Roda **depois** do
`RowPayloadValidator` (estrutural) no create/update/bulk-update de row. É async
porque algumas regras consultam o banco (is-unique, email-exists, ...).

## Arquivos

| Arquivo                               | Responsabilidade                                            |
| ------------------------------------- | ---------------------------------------------------------- |
| `field-validation-contract.service.ts`| Abstract `FieldValidationContractService` + `FieldValidationOptions` |
| `field-validation.service.ts`         | `@Service() export default` — impl                          |
| `field-validation.service.spec.ts`    | Specs (is-unique/email-exists/user-exists com in-memory repos) |

Registrado no DI **automaticamente** pelo scanner (contract ↔ impl por
convenção). Não há in-memory dedicado: os specs instanciam a impl real com
repositórios in-memory.

## Contrato

```ts
validate(
  payload: Record<string, unknown>,
  table: RowTableContext,
  options?: { skipMissing?: boolean; currentRowId?: string | null },
): Promise<Record<string, string> | null>   // mapa slug → mensagem, ou null
```

- Itera `table.fields`, pula nativos/sem-validations e (com `skipMissing`) os
  ausentes do payload; para cada regra de `field.validations` chama
  `getValidationRule(rule).validate(...)`. **Uma mensagem por campo** (primeira
  regra que falha).
- Injeta `RowContractRepository` + `UserContractRepository` por constructor.
  Monta `ValidationDeps` por chamada, com a `table` capturada no closure:
  - `countFieldValue` → `RowContractRepository.countFieldValue` (match **exato**,
    exclui trashed e `currentRowId`; difere de `count` que usa `$regex` parcial).
  - `userExistsByEmail` → `UserContractRepository.findByEmail`.
  - `userExistsByIdOrEmail` → tenta `findById` (try/catch p/ CastError) e cai no
    e-mail.

## Onde é chamado

- `resources/table-rows/create/create.use-case.ts` — após validação estrutural.
- `resources/table-rows/update/update.use-case.ts` — com `skipMissing: true` +
  `currentRowId: payload._id`.
- `resources/table-rows/bulk-update/bulk-update.use-case.ts` — injeta o service e
  o repassa ao `TableRowUpdateUseCase` que constrói internamente.

Erro → `left(HTTPException.BadRequest('Requisição inválida',
'INVALID_PAYLOAD_FORMAT', errors))` (mesmo formato do validador estrutural).
