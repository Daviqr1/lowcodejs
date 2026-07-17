# Pacote `forms`

Pacote de extensões oficiais que enriquecem os **formulários** das tabelas
low-code. Diferente do pacote `core` (auto-ativado no boot), as extensões de
`forms` seguem o ciclo padrão: registradas pelo loader no boot e ativadas pelo
MASTER em `/extensions`. Ver `backend/extensions/CLAUDE.md` para o mecanismo de
loader, manifests e ativação.

## Estrutura

```
forms/
└── plugins/
    ├── conditional-fields/         ← mostra/oculta campos por regras (slot table.fields.manage)
    └── cascade-dropdown/           ← relacionamento em 2 níveis dependentes (slot table.field.relationship.config)
```

Cada plugin é um leaf simples: `manifest.json` + `controller.ts` +
`*-config.model.ts` (persistência da config por tabela) + `*.validator.ts` +
`*.schema.ts` (docs OpenAPI) + `*.types.ts`. Cada um tem seu CLAUDE.md próprio
(`plugins/<id>/CLAUDE.md`).

## Plugins

| ID | Slot | Rota do controller | Descrição |
| -- | ---- | ------------------ | --------- |
| `conditional-fields` | `table.fields.manage` | `/plugins/conditional-fields` | Regras por tabela para mostrar/ocultar campos e grupos de campos no formulário. `GET /tables/:slug/runtime` (config aplicada no form), `GET /tables/:slug/config` (edição), `PUT /tables/:slug/config` (salvar) |
| `cascade-dropdown` | `table.field.relationship.config` | `/plugins/cascade-dropdown` | Configura um campo `RELATIONSHIP` para seleção em dois níveis dependentes (pai → filtra filho). `GET`/`PUT /tables/:slug/fields/:fieldId/config` e `GET .../parent-options` + `.../child-options` para popular os selects em runtime |

## Convenções

- **Guarda runtime**: ambos os controllers aplicam
  `ExtensionActiveMiddleware({ pkg: 'forms', type: PLUGIN, extensionId })` →
  404 quando o plugin está desativado.
- **Acesso à tabela**: usam `AuthenticationMiddleware` + `TableAccessMiddleware`
  (checagem RBAC + `E_TABLE_PERMISSION`) antes de ler/gravar config.
- **Config por tabela**: persistida pelo `*-config.model.ts` próprio do plugin,
  não no documento Table do core.
- Mensagens em PT-BR; design system obrigatório no entry React (frontend espelha
  em `frontend/extensions/forms/`).

## Gotchas

- Os slots `table.fields.manage` e `table.field.relationship.config` são
  específicos destes plugins — não fazem parte do catálogo de slots reservados
  listado em `backend/extensions/CLAUDE.md`.
- `cascade-dropdown` resolve registros via `TableMongooseRepository` +
  builders dinâmicos (`MongooseModelBuilder`, `MongooseQueryBuilder`) para
  consultar as collections do DB data nos endpoints de opções.
