# cascade-dropdown (plugin `forms`, backend)

Configura um campo `RELATIONSHIP` para seleção em **dois níveis dependentes**
(pai → filtra filho). Slot `table.field.relationship.config`. Ativado pelo
MASTER em `/extensions`.

| Arquivo                            | Papel                                                          |
| ---------------------------------- | -------------------------------------------------------------- |
| `manifest.json`                    | Declaração do plugin (id, type, slot)                          |
| `cascade-dropdown.controller.ts`   | Rotas: `GET`/`PUT /tables/:slug/fields/:fieldId/config` + `.../parent-options` e `.../child-options`. Só roteia — a lógica está nos 4 use-cases |
| `get-config` / `save-config` / `parent-options` / `child-options` `.use-case.ts` | Um por rota, Either pattern |
| `cascade-dropdown-query.service.ts` | Monta a query mongo a partir da config, resolve o model dinâmico e traduz valor em label. `findUsableConfig()` é o guard que descarta config incoerente com o schema atual |
| `cascade-dropdown-config.repository.ts` | Persistência da config por tabela (fora do documento Table) |
| `cascade-dropdown-config.model.ts` | Schema/model mongoose da config                               |
| `cascade-dropdown.validator.ts`    | Zod de input                                                   |
| `cascade-dropdown.schema.ts`       | Schemas Fastify/OpenAPI                                        |
| `cascade-dropdown.types.ts`        | Tipos/DTOs                                                     |

Guardado por `ExtensionActiveMiddleware` + `TableAccessMiddleware`. Visão geral
do pacote em [../../CLAUDE.md](../../CLAUDE.md) (`extensions/forms/`).
