# Relacionamento: modo de vínculo por campo (`select` | `manage`)

## Contexto

O redesenho de cardinalidade trocou a UI de relacionamento (antes: multi-select de vínculo
direto no formulário) pelo modelo "gerenciar itens" (cards no form, tabela+Sheet no detalhe,
criação inline de registros). Isso é poderoso, mas tirou o caso simples/comum (só vincular
registros existentes via um multi-select) que existia antes do redesenho — e que muitos usuários
querem. Objetivo: **adicionar uma opção por campo** (na criação/edição do campo) para escolher
como o relacionamento se comporta no formulário, **sem remover** o modo atual.

O componente antigo (`TableRowRelationshipField`, combobox single/multi com "vincular existente"
+ "Novo registro" inline via `RelatedRowCreateDialog`) e o caminho dual-write
(`RelationshipBuilder.extract`/`persist`: `row[slug]=ids` → links) **ainda existem** no código —
o modo `select` reusa ambos, sem código novo de persistência.

## Modos (config do campo)

Novo controle na tela de criar/editar campo de relacionamento — "Como vincular no formulário?":

- **`select` (Vínculo simples / multi-select)** — combobox para vincular registros existentes
  e criar novo inline (gated por `allowCreateRelationshipRecords`). Mostra o seletor **"Rótulo"**
  (qual campo da tabela relacionada vira o texto da opção/chip — é o ex-"campo de relacionamento"
  renomeado). Sem tabela interna de gestão.
- **`manage` (Gerenciar registros)** — comportamento atual: toggles "gerenciar pela tabela A/B"
  (`visible`), cards no form, tabela+Sheet no detalhe, rótulo auto-derivado.

Persistência: `relationship.formMode: 'select' | 'manage'`.

**Default: `select`.** Dado legado/sem `formMode` → tratado como `select` (relacionamentos
antigos/migrados voltam a funcionar como o multi-select de antes, sem mudança percebida). Campo
novo nasce `select`; usuário troca para `manage` quando quiser.

## Comportamento por camada

| Camada | `select` | `manage` (atual) |
| --- | --- | --- |
| Form (auto-save) | `TableRowRelationshipField` (combobox single/multi por `field.multiple`); **inclui** o slug no payload → dual-write `extract`/`persist` → links | `RelationshipRowsInline` (repetidor); **exclui** do payload; persiste via `/links` |
| Detalhe | chips dos vinculados + combobox (vincular/desvincular/criar) | `RelationshipRowsDataTable` (tabela + Sheet) |
| Célula da listagem | rótulos (chips), via "Rótulo" configurado | count (badge) |
| Config exibida | seletor "Rótulo" | toggles visible A/B (rótulo auto) |

## Arquivos

**Backend**
- `application/model/field.model.ts` — `relationship.formMode` (`enum ['select','manage']`,
  default não imposto no schema; ausência interpretada como `select` no app/frontend).
- `application/core/entity.core.ts` — tipo `formMode?` no config de relationship.
- `application/resources/table-fields/table-field-base.schema.ts` (zod) — aceitar `formMode`.
- Response schemas já passam campos extras (`additionalProperties: true` nos blocos relationship);
  opcional documentar `formMode` explícito.
- Sem mudança em `extract`/`persist`/validador (já prontos; validador ignora RELATIONSHIP no
  payload, e o `extract` continua tratando os ids quando vierem — modo `select`).

**Frontend**
- `field/create/-create-form.tsx` + `field/$fieldId/-update-form.tsx`: controle `formMode`;
  quando `select`, mostra seletor **"Rótulo"** (reusar `@/components/common/selectors/field-combobox`
  num componente leve `TableFieldRelationshipLabelSelect`, ou recriar enxuto) e seta
  `relationship.fieldSlug`/`fieldId`; quando `manage`, mantém toggles visible + auto-derive.
- `routes/.../row/-auto-save-row-form.tsx` + `create/-create-form.tsx` (`RowFormFields`):
  ramificar por `formMode` — `select` renderiza `TableRowRelationshipField` e **entra** no
  `buildRowPayload`; `manage` usa `RelationshipRowsInline` e fica fora do payload.
- `routes/.../row/-row-detail-view.tsx` (`renderRelationshipTab`): `select` → componente leve
  de chips+combobox (reusar `TableRowRelationshipField` em modo edição ou um wrapper com
  link/unlink via `/links`); `manage` → `RelationshipRowsDataTable`.
- `table-cells/table-row-relationship-cell.tsx`: `select` → chips de rótulos (resolve via
  `resolveRelationshipLabel` + tabela relacionada); `manage` → count (atual). Recebe `formMode`.
- `lib/interfaces.ts` (`IFieldConfigurationRelationship`): `formMode?`.

## Pontos a resolver no plano
- Campo-espelho (mirror, `visible:false`) em `select`: não renderizar como multi-select no outro
  lado a menos que `field.permissions.form` permita — manter "antigo funciona como antes" (lado
  declarante só). Definir via `visible`/permissions.
- Cardinalidade single (1:1 / lado não-múltiplo) em `select`: combobox single (substitui), igual
  ao histórico.
- Reuso máximo de componentes pré-redesenho ainda presentes; evitar duplicar lógica.

## Verificação
- `cd backend && npm run test:unit`; `cd frontend && npm run lint` (tsc baseline ~100, zero novo).
- Manual (usuário roda):
  1. Criar campo relacionamento `select`: form mostra multi-select (vincular existente + novo);
     salva; chips com rótulo na listagem; detalhe com chips+combobox.
  2. Criar campo `manage`: comportamento atual (cards/sheet/count).
  3. Relacionamento legado (sem `formMode`) → aparece como `select` (multi-select), como antes.
- e2e: usuário roda.
