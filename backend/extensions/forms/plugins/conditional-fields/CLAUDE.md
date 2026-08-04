# conditional-fields (plugin `forms`, backend)

Regras por tabela para **mostrar/ocultar** campos e grupos de campos no
formulário. Slot `table.fields.manage`. Ativado pelo MASTER em `/extensions`.

| Arquivo                               | Papel                                                        |
| ------------------------------------- | ------------------------------------------------------------ |
| `manifest.json`                       | Declaração do plugin (id, type, slot)                        |
| `conditional-fields.controller.ts`    | Rotas: `GET /tables/:slug/runtime` (config aplicada no form), `GET`/`PUT /tables/:slug/config` (edição/salvar). Só roteia |
| `get-config.use-case.ts`              | Lê a config da tabela                                        |
| `update-config.use-case.ts`           | Valida as regras (campo controlador existe, valor da condição existe, sem auto-referência, sem mostrar+ocultar o mesmo campo) e salva |
| `conditional-fields-config.repository.ts` | Persistência da config por tabela                        |
| `conditional-fields-config.model.ts`  | Schema/model mongoose da config                              |
| `conditional-fields.validator.ts`     | Zod de input                                                 |
| `conditional-fields.schema.ts`        | Schemas Fastify/OpenAPI                                      |
| `conditional-fields.types.ts`         | Tipos/DTOs                                                   |

Guardado por `ExtensionActiveMiddleware` + `TableAccessMiddleware`. Visão geral
do pacote em [../../CLAUDE.md](../../CLAUDE.md) (`extensions/forms/`).
