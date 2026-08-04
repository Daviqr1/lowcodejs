# email-exists — Regra de validação de campo

`export default new EmailExistsRule()` (`FieldValidationRule`, **async**).
Garante que o e-mail digitado pertence a um usuário existente (coleção User) via
`deps.userExistsByEmail`.

Contrato, registry e visão geral das 15 regras em [../CLAUDE.md](../CLAUDE.md).
