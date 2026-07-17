# Pacote `forms` (frontend)

Espelho UI de `backend/extensions/forms/`. Pacote oficial de extensões
**opcionais** voltadas à configuração de formulários de tabela — começam
desativadas, MASTER ativa em `/extensions`. A declaração canônica (manifest +
upsert no DB) vive no backend.

## Estrutura

```
forms/
└── plugins/
    ├── conditional-fields/
    │   └── index.tsx        ← Sheet de regras mostrar/ocultar (slot table.fields.manage)
    └── cascade-dropdown/
        └── index.tsx        ← configurador de relacionamento dependente (slot table.field.relationship.config)
```

## Extensões

| Tipo      | ID                   | Slot                              | Descrição                                                                                                      |
| --------- | -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `plugins` | `conditional-fields` | `table.fields.manage`             | Regras por tabela que mostram/ocultam campos e grupos no formulário a partir do valor de um dropdown/categoria |
| `plugins` | `cascade-dropdown`   | `table.field.relationship.config` | Configura um campo RELATIONSHIP para depender de outro (seleção em cascata pai → filho)                        |

## conditional-fields

Item de dropdown ("Configurar condicionais") que abre um `Sheet` listando as
regras da tabela. Cada regra tem um **campo controlador** (DROPDOWN ou
CATEGORY), um valor-gatilho e listas de campos a **mostrar**/**ocultar** —
incluindo campos dentro de grupos. Regras são reordenáveis (move up/down) e
validadas contra conflitos (`findConditionalRuleConflicts` de
`@/lib/conditional-form-rules`): um campo não pode estar marcado para mostrar e
ocultar ao mesmo tempo. Persiste em
`GET/PUT /plugins/conditional-fields/tables/<slug>/config`. Só renderiza para
quem tem permissão `UPDATE_TABLE`.

## cascade-dropdown

Painel injetado na configuração de um campo RELATIONSHIP. Permite escolher qual
**campo pai** (outro RELATIONSHIP da mesma tabela) deve, ao mudar, atualizar as
opções deste campo, casando pelo campo correspondente na tabela-fonte. Suporta
filtros extras por campo (operadores `equals`, `contains`, `date_between`, etc.)
e larguras relativas pai/filho. Persiste em
`GET/PUT /plugins/cascade-dropdown/tables/<slug>/fields/<fieldId>/config`.
Retorna `null` quando o campo alvo não é RELATIONSHIP ou não há combinação
pai/filho compatível.

## Convenções

- Entry é **index.tsx** com `export default function ...`
- Recebe as props do slot (ex.: `table`, `targetField`, `sourceTableSlug`) via
  spread do `context` do `<ExtensionSlot>` — ver
  `frontend/src/components/common/extension-slot/CLAUDE.md`
- Tipos de regra/conflito vivem em `@/lib/conditional-form-rules`; query keys
  ficam em `@/hooks/tanstack-query/`
