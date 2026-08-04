# not-empty — Regra de validação de campo

`export default new NotEmptyRule()` (`FieldValidationRule`). Rejeita valor vazio
— é a **única** regra pura que não ignora vazio (as demais delegam a
obrigatoriedade a esta).

Contrato, registry e visão geral das 15 regras em [../CLAUDE.md](../CLAUDE.md).
Executada (async) pelo `FieldValidationService` no create/update de row.
