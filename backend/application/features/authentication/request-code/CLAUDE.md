# Request Code

Solicita um codigo de recuperacao de senha para o email informado.

## Endpoint
`POST /authentication/recovery/request-code` | Auth: Nao | Permission: Nenhuma

## Fluxo
1. Middleware: Nenhum
2. Validator: `RequestCodeBodyValidator` - campos: `email` (string, email, required, trim)
3. UseCase: `RequestCodeUseCase`
   - Busca usuario por email exato via `userRepository.findBy({ email, exact: true })`
   - Se usuario nao encontrado, retorna Left (404 EMAIL_NOT_FOUND)
   - Gera codigo numerico de 6 digitos (`Math.floor(100000 + Math.random() * 900000)`)
   - Cria token de validacao via `validationTokenRepository.create({ code, status: E_TOKEN_STATUS.REQUESTED, user: user._id })`
   - TODO: enviar e-mail com o codigo (comentado no codigo)
   - Retorna Right com null
4. Repository: `UserContractRepository.findBy`, `ValidationTokenContractRepository.create`

## Regras de Negocio
- Email deve estar cadastrado no sistema
- Codigo gerado e numerico de 6 digitos
- Token criado com status REQUESTED
- Envio de e-mail ainda nao implementado (TODO no codigo)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | INVALID_PAYLOAD_FORMAT | Body falha na validacao Zod/AJV |
| 404 | EMAIL_NOT_FOUND | Email nao cadastrado |
| 500 | REQUEST_CODE_ERROR | Erro interno |

## Testes
- Unit: `request-code.use-case.spec.ts`
- E2E: `request-code.controller.spec.ts`
