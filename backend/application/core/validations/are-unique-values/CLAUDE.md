# are-unique-values — Regra de validação de campo

`export default new AreUniqueValuesRule()` (`FieldValidationRule`, **async**).
Campo múltiplo: elementos únicos entre si **e** sem colidir na coluna.
`appliesTo`: `field.multiple`. Consulta o banco via `deps.countFieldValue`.

Contrato, registry e visão geral das 15 regras em [../CLAUDE.md](../CLAUDE.md).
