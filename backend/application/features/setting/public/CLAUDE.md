# Public Setting

Retorna apenas o subconjunto de configuracoes seguro para visitantes nao
autenticados. Usado pelo SSR do frontend (`__root.tsx`) para popular `<title>`,
meta tags Open Graph, flag do assistente IA e estado do setup wizard sem
expor credenciais.

## Endpoint
`GET /setting/public` | Auth: Nenhuma | Permission: nenhuma

## Fluxo
1. Sem middleware de autenticacao
2. Validator: nenhum
3. UseCase:
   - Busca settings via settingRepository.get()
   - Se nao existir: retorna defaults explicitos do subset publico
   - Se existir: projeta apenas os 8 campos publicos
4. Repository: SettingContractRepository (get)

## Campos Retornados

| Campo | Tipo | Default |
|-------|------|---------|
| SYSTEM_NAME | string | "LowCodeJs" |
| SYSTEM_DESCRIPTION | string | "Plataforma Oficial" |
| LOGO_SMALL_URL | string \| null | null |
| LOGO_LARGE_URL | string \| null | null |
| AI_ASSISTANT_ENABLED | boolean | false |
| CHAT_HISTORY_ENABLED | boolean | false |
| SETUP_COMPLETED | boolean | false |
| SETUP_CURRENT_STEP | string \| null | "admin" |

## Regras de Negocio
- NAO expor: STORAGE_*, EMAIL_PROVIDER_*, OPENAI_API_KEY, FILE_UPLOAD_*, PAGINATION_PER_PAGE, MODEL_CLONE_TABLES, LOCALE
- NAO requer cookies — chamado pelo SSR sem sessao
- Retorna 200 mesmo sem documento (defaults)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | SETTINGS_READ_ERROR | Erro ao buscar configuracoes no banco |

## Testes
- Unit: `public.use-case.spec.ts`
- E2E: `public.controller.spec.ts` (inclui regressao de seguranca para campos sensiveis)
