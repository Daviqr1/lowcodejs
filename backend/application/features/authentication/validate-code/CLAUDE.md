# Validate Code

Valida um codigo de recuperacao de senha e retorna o usuario associado.

## Endpoint
`POST /authentication/recovery/validate-code` | Auth: Nao | Permission: Nenhuma

## Fluxo
1. Middleware: Nenhum
2. Validator: `ValidateCodeBodyValidator` - campos: `code` (string, min 1, required, trim)
3. UseCase: `ValidateCodeUseCase`
   - Busca token de validacao por codigo exato via `validationTokenRepository.findBy({ code, exact: true })`
   - Se token nao encontrado, retorna Left (404 VALIDATION_TOKEN_NOT_FOUND)
   - Se token ja expirado (`E_TOKEN_STATUS.EXPIRED`), retorna Left (410 VALIDATION_TOKEN_EXPIRED)
   - Calcula diferenca de tempo com `differenceInMinutes(now, token.createdAt)`
   - Se diferenca > 10 minutos, atualiza status para EXPIRED e retorna Left (410 VALIDATION_TOKEN_EXPIRED)
   - Atualiza status do token para VALIDATED
   - Retorna Right com `{ user: token.user }`
4. Repository: `ValidationTokenContractRepository.findBy`, `ValidationTokenContractRepository.update`

## Regras de Negocio
- Codigo deve existir no banco
- Token nao pode estar expirado (status ou tempo > 10 minutos)
- Apos validacao, status do token muda para VALIDATED
- Retorna o usuario associado ao token (para uso no proximo passo: reset-password)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Body falha na validacao Zod/AJV |
| 404 | VALIDATION_TOKEN_NOT_FOUND | Codigo nao encontrado no banco |
| 410 | VALIDATION_TOKEN_EXPIRED | Token expirado (status ou tempo > 10min) |
| 500 | VALIDATE_CODE_ERROR | Erro interno |

## Testes
- Unit: `validate-code.use-case.spec.ts`
- E2E: `validate-code.controller.spec.ts`
