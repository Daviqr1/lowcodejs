# Setting

Configuracoes globais da plataforma (singleton). Leitura e atualizacao.

## Base Route

`/setting`

## Operacoes

| Operacao | Metodo | Rota | Auth / Permissao |
|----------|--------|------|------------------|
| show | GET | `/setting` | Auth only (sem PermissionMiddleware) |
| public | GET | `/setting/public` | Nenhuma (publico, subset seguro p/ SSR) |
| update | PUT | `/setting` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_SETTINGS)` |

## Middlewares

`AuthenticationMiddleware` roda primeiro nas rotas autenticadas.

- **update** (`PUT /setting`) e gated por
  `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_SETTINGS)`.
- **show** (`GET /setting`) permanece AUTH-ONLY (sem PermissionMiddleware): ele
  alimenta a configuracao de upload de arquivos e o boot da aplicacao para
  qualquer usuario autenticado, por isso nao pode exigir MANAGE_SETTINGS.
- **public** (`GET /setting/public`) permanece NO-AUTH (subset seguro p/ SSR).

## Repositorios Utilizados

- `SettingContractRepository` - get e update do documento singleton

## Comportamento Chave

- Documento singleton no MongoDB (sempre 1 registro)
- Se nao existir, show retorna env vars do process.env como fallback
- Update sincroniza valores com process.env em runtime
- FILE_UPLOAD_ACCEPTED e armazenado como string separada por ";" e retornado como array
- MODEL_CLONE_TABLES inclui templates built-in (KANBAN, CARDS, MOSAIC, DOCUMENT, FORUM, CALENDAR) + tabelas customizadas do banco
- Templates built-in sao filtrados no update (nao podem ser removidos)
