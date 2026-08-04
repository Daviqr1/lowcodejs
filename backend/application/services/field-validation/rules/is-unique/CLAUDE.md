# is-unique — Regra de validação de campo

`export default new IsUniqueRule()` (`FieldValidationRule`, **async**). Garante
valor único na coluna da própria tabela; no update exclui a `currentRowId`.
`appliesTo`: TEXT_SHORT não-múltiplo. Consulta o banco via
`deps.countFieldValue`.

Contrato, registry e visão geral das 15 regras em [../CLAUDE.md](../CLAUDE.md).
