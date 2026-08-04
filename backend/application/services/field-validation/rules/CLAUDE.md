# Validations — Camada Única de Validação de Campo

Regras de validação de valor configuráveis por campo (`field.validations[]`).
Cada regra vive numa **subpasta própria** e implementa o contrato
`FieldValidationRule`. É a fonte única para as validações novas (is-unique,
ranges, etc.) e re-expõe como regras selecionáveis o que o `format` legado já
validava (email, cpf, ...).

> O `format` do campo **continua validando** (legado, síncrono, em todos os
> caminhos de escrita de row via `RowPayloadValidator`). Esta camada é
> **aditiva** e roda no `FieldValidationService` (async) no create/update/
> bulk-update de row. Ver `services/field-validation/CLAUDE.md`.

## Arquivos

| Arquivo            | Responsabilidade                                                                 |
| ------------------ | -------------------------------------------------------------------------------- |
| `rule.contract.ts` | Classe abstrata `FieldValidationRule` + tipos `ValidationContext`/`ValidationDeps`/`ValidationFieldShape` + helper `isEmptyValue` |
| `registry.ts`      | Importa cada subpasta e monta `VALIDATION_REGISTRY: Map<key, rule>`; `getValidationRule(key)` |
| `<regra>/index.ts` | Uma subpasta por regra; `export default new <Regra>Rule()`                        |
| `validations.spec.ts` | Specs das regras puras via registry                                            |

## Contrato (`rule.contract.ts`)

```ts
abstract class FieldValidationRule {
  abstract readonly key: ValueOf<typeof E_FIELD_VALIDATION>;
  abstract readonly label: string;          // PT-BR
  abstract readonly requiresConfig: boolean;
  abstract appliesTo(field: ValidationFieldShape): boolean; // { type, format, multiple }
  abstract validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,             // { field, payload, currentRowId, deps }
  ): Promise<string | null>;                // mensagem PT-BR ou null
}
```

- Assinatura **única async** — regras puras simplesmente não awaitam.
- `ValidationDeps` (montado pelo service, tabela capturada no closure):
  `countFieldValue(fieldSlug, value, excludeRowId)`, `userExistsByEmail(email)`,
  `userExistsByIdOrEmail(idOrEmail)`. Mantém o core agnóstico de Mongoose/repos.
- `isEmptyValue(value)` — regras puras (exceto `NOT_EMPTY`) ignoram valor vazio
  para não duplicar a checagem de obrigatoriedade.

## Regras (15 subpastas)

**Puras (síncronas, sem banco):**
`not-empty`, `is-email`, `is-numeric`, `is-alpha-numeric`,
`is-in-range` (config `{ min?, max? }`), `is-iban`, `is-not` (config
`{ values: string[] }`), e as migradas do format: `is-url`, `is-phone`,
`is-cpf`, `is-cnpj`. Regexes vêm de `core/field-rules.core.ts` (fonte única,
compartilhada com o `RowPayloadValidator`).

**Async (consultam o banco):**
- `is-unique` — valor único na coluna da própria tabela (no update exclui
  `currentRowId`). `appliesTo`: TEXT_SHORT não-múltiplo.
- `are-unique-values` — campo múltiplo: elementos únicos entre si **e** sem
  colidir na coluna. `appliesTo`: `field.multiple`.
- `email-exists` — e-mail digitado pertence a um usuário (coleção User).
- `user-exists` — valor (id ou e-mail) corresponde a um usuário. TEXT_SHORT/USER.

## Como adicionar uma regra nova

1. Criar `core/validations/<minha-regra>/index.ts` com classe que estende
   `FieldValidationRule` (`key` ∈ `E_FIELD_VALIDATION` — acrescente o enum em
   `entity.core.ts`), `export default new ...()`.
2. Registrar a instância em `registry.ts` (array `RULES`).
3. Espelhar no front: `frontend/src/lib/constant.ts`
   (`E_FIELD_VALIDATION` + `FIELD_VALIDATION_OPTIONS`); se for **pura**,
   replicar a lógica em `frontend/src/lib/table.ts` (`validatePureRules`).
4. Regra async → usar `context.deps`; pode exigir nova dep no `ValidationDeps`
   (montada no `FieldValidationService`).
