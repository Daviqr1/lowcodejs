# cascade-dropdown (plugin `forms`, backend)

Configura um campo `RELATIONSHIP` para seleção em **dois níveis dependentes**
(pai → filtra filho). Slot `table.field.relationship.config`. Ativado pelo
MASTER em `/extensions`.

| Arquivo                            | Papel                                                          |
| ---------------------------------- | -------------------------------------------------------------- |
| `manifest.json`                    | Declaração do plugin (id, type, slot)                          |
| `cascade-dropdown.controller.ts`   | Rotas: `GET`/`PUT /tables/:slug/fields/:fieldId/config` + `.../parent-options` e `.../child-options` |
| `cascade-dropdown-config.model.ts` | Persistência da config por tabela (fora do documento Table)    |
| `cascade-dropdown.validator.ts`    | Zod de input                                                   |
| `cascade-dropdown.schema.ts`       | Schemas Fastify/OpenAPI                                        |
| `cascade-dropdown.types.ts`        | Tipos/DTOs                                                     |

Guardado por `ExtensionActiveMiddleware` + `TableAccessMiddleware`. Visão geral
do pacote em [../../CLAUDE.md](../../CLAUDE.md) (`extensions/forms/`).
