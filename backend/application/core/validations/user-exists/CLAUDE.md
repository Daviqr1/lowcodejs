# user-exists — Regra de validação de campo

`export default new UserExistsRule()` (`FieldValidationRule`, **async**).
Garante que o valor referencia um usuário existente por id **ou** e-mail via
`deps.userExistsByIdOrEmail`.

Contrato, registry e visão geral das 15 regras em [../CLAUDE.md](../CLAUDE.md).
