# Show Setting

Retorna as configuracoes globais completas da plataforma (incluindo credenciais
de SMTP, S3 e OpenAI). Por isso requer autenticacao.

> Para o subconjunto seguro consumido pelo SSR do frontend (visitantes nao
> autenticados), use `GET /setting/public` (ver `../public/CLAUDE.md`).

## Endpoint
`GET /setting` | Auth: Obrigatorio | Permission: nenhuma

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: nenhum
3. UseCase:
   - Busca settings via settingRepository.get()
   - Se nao existir: retorna um objeto com defaults explicitos (mesmos do schema Mongoose) + templates built-in. Nao le process.env
   - Se existir: retorna settings com FILE_UPLOAD_ACCEPTED splitado por ";" e templates built-in concatenados com MODEL_CLONE_TABLES do banco
4. Repository: SettingContractRepository (get)

## Regras de Negocio
- Auth obrigatoria (payload contem credenciais sensiveis: STORAGE_SECRET_KEY, EMAIL_PROVIDER_PASSWORD, OPENAI_API_KEY)
- Fallback sem banco usa defaults proprios (SYSTEM_NAME='LowCodeJs', LOCALE='pt-br', etc.) — nao depende de env
- FILE_UPLOAD_ACCEPTED sempre retornado como array (split por ";")
- MODEL_CLONE_TABLES sempre inclui 6 templates built-in: Kanban, Cards, Mosaico, Documento, Forum, Calendario

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | SETTINGS_READ_ERROR | Erro ao buscar configuracoes |

## Testes
- Unit: `show.use-case.spec.ts`
- E2E: `show.controller.spec.ts`
