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
| `rule-registry-contract.service.ts`   | Abstract `FieldValidationRuleRegistryContractService` (`get`/`list`) + `ValidationRuleKey` |
| `rule-registry.service.ts`            | `@Service() export default` — array `RULES` → `Map<key, rule>` |
| `rule-registry.service.spec.ts`       | Specs do registry e das regras puras                        |
| `field-validation-rule.contract.ts`   | Abstract `FieldValidationRule` (classe-base das regras) + `ValidationContext`/`ValidationDeps`/`ValidationFieldShape` — **não injetável** |
| `rules/`                              | Uma subpasta por regra — ver `rules/CLAUDE.md`              |

Os dois pares contract ↔ impl são registrados no DI **automaticamente** pelo
scanner. Não há in-memory dedicado: os specs instanciam a impl real com
repositórios in-memory.

`field-validation-rule.contract.ts` fica **fora** do padrão
`-contract.service.ts` de propósito: é contrato de regra, não de service, e o
scanner do `di-registry.ts` procuraria uma impl irmã inexistente (avisando
`impl ausente` em todo boot).

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
