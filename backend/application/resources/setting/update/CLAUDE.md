# Update Setting

Atualiza as configuracoes globais da plataforma.

## Endpoint
`PUT /setting` | Auth: Yes | Permission: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_SETTINGS)`

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio, roda primeiro) +
   `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_SETTINGS)`
2. Validator: SettingUpdateBodyValidator — todos os campos sao opcionais (defaults no schema Mongoose). Campos: SYSTEM_NAME, LOCALE, STORAGE_DRIVER, STORAGE_*, FILE_UPLOAD_MAX_SIZE, FILE_UPLOAD_ACCEPTED, FILE_UPLOAD_MAX_FILES_PER_UPLOAD, PAGINATION_PER_PAGE, MODEL_CLONE_TABLES, LOGO_SMALL_URL/LARGE_URL, EMAIL_PROVIDER_HOST/PORT/USER/PASSWORD/FROM, OPENAI_API_KEY, AI_ASSISTANT_ENABLED
3. UseCase:
   - Filtra MODEL_CLONE_TABLES removendo IDs de templates built-in e IDs invalidos (nao ObjectId)
   - Atualiza settings via settingRepository.update
   - Quando STORAGE_DRIVER='s3', chama StorageService.ensureBucket()
   - Retorna settings atualizado com FILE_UPLOAD_ACCEPTED splitado
4. Repository: SettingContractRepository (update)

## Regras de Negocio
- PUT parcial — campos ausentes preservam o valor atual
- Templates built-in (KANBAN_TEMPLATE, CARDS_TEMPLATE, MOSAIC_TEMPLATE, DOCUMENT_TEMPLATE) sao filtrados do MODEL_CLONE_TABLES
- Somente ObjectIds validos sao mantidos em MODEL_CLONE_TABLES
- Sem side-effect em process.env — consumidores (chat.socket, email service) leem do Setting model

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | SETTINGS_UPDATE_ERROR | Erro ao atualizar configuracoes |

## Testes
- Unit: `update.use-case.spec.ts`
- E2E: `update.controller.spec.ts`
