# Tables Import/Export (extensão `core/tools/tables-import-export`)

Tool unificada que expõe dois endpoints para **exportar e importar múltiplas
tabelas** preservando relacionamentos e itens de menu. Antes era recurso
`/tools/{export,import}-table` do core; foi migrado para extensão como TOOL
única (uma página com 2 seções: Importar e Exportar).

## Acesso UI

`/tools/core/tables-import-export` — submenu **Ferramentas** na sidebar (uma
única página com cards de Importar e Exportar lado a lado).

## Endpoints

| Endpoint | Método | bodyLimit | Descrição |
|----------|--------|-----------|-----------|
| `/tools/export-table` | POST | default | Exporta uma ou mais tabelas (estrutura e/ou dados) + itens de menu vinculados em JSON v2 |
| `/tools/import-table` | POST | 50 MB | Recria as tabelas, dados (com remapeamento de relacionamentos) e menus a partir de um JSON v1 ou v2 |

Ambos blindados por `ExtensionActiveMiddleware({ pkg: 'core', type: TOOL,
extensionId: 'tables-import-export' })` — desativar a tool em `/extensions`
desliga ambos os endpoints.

## Formato do arquivo (v2)

```jsonc
{
  "header": {
    "version": "2.0",
    "platform": "lowcodejs",
    "tableName": "Clientes",          // nome da primeira tabela (compat)
    "tableSlug": "clientes",
    "exportedBy": "user@example.com",
    "exportedAt": "2026-05-13T...",
    "exportType": "full",
    "tablesCount": 2,
    "menusCount": 3
  },
  "tables": [
    {
      "structure": { /* campos, grupos, fieldOrder, layoutFields, methods */ },
      "data": {
        "totalRows": 10,
        "rows": [
          {
            "_originalId": "abc...",
            "_originalCreator": "user-id...",   // criador da row (campo CREATOR)
            "nome": "Acme",
            "produtos": ["xyz...", "..."],       // RELATIONSHIP — remapeado
            "responsavel": ["user-id..."]        // USER — preservado como ID
          }
        ]
      }
    }
  ],
  "menus": [
    {
      "_originalId": "...",
      "name": "Vendas",
      "slug": "vendas",
      "type": "SEPARATOR",
      "parent": null,
      "tableSlug": null,
      "url": null,
      "html": null,
      "order": 0,
      "isInitial": false,
      "extension": null
    },
    {
      "_originalId": "...",
      "parent": "...",            // _originalId do menu pai (resolvido na importação)
      "type": "TABLE",
      "tableSlug": "clientes",     // resolve para o ID novo após import
      "slug": "menu-clientes",
      "name": "Clientes",
      ...
    }
  ]
}
```

Arquivos v1 (single-table, com `structure` e `data` no topo) continuam
suportados na importação — internamente são normalizados para o formato v2.

## Export

### Validator
`ExportTableValidator`:
- `slugs: string[]` (preferido) **ou** `slug: string` (legado)
- `exportType: 'structure' | 'data' | 'full'`
- `acknowledgeMissingRelationships: boolean` (default `false`)

### Fluxo
1. Auth + `ExtensionActiveMiddleware`
2. Resolve todas as tabelas pelos slugs; falha com `TABLE_NOT_FOUND` se faltar
   alguma
3. Detecta tabelas referenciadas em campos `RELATIONSHIP` (top-level e dentro
   de field groups) que **não** estão na seleção
4. Se houver e `acknowledgeMissingRelationships !== true`, retorna 400
   `MISSING_RELATED_TABLES` com a lista — o frontend mostra o aviso e
   oferece "Voltar para ajustar" ou "Exportar mesmo assim"
5. Para cada tabela: monta `structure` (quando `structure|full`) e/ou `data`
   (quando `data|full`)
   - **Relacionamentos são preservados**: campos RELATIONSHIP exportam os
     IDs originais para serem remapeados na importação
   - **Campos USER e o criador (CREATOR)**: viajam como IDs de usuário
     (`string`/`string[]`). Resolvem na mesma instância; em instância
     diferente o ID pode não existir e o campo fica vazio (sem erro)
   - Campos referenciais que NÃO viajam: `FILE`, `EVALUATION`, `REACTION`
     (dependem de arquivos físicos ou de agregados da instância de origem)
   - As `validations` (regras de validação) de cada campo **viajam** na
     estrutura e são recriadas na importação (round-trip preserva as regras)
   - Cada row carrega `_originalId` para o remapeamento e `_originalCreator`
     (quando há criador) para restaurar o campo nativo CREATOR na importação.
     Subrows de field groups carregam os mesmos dois marcadores
6. Coleta menus que apontam para qualquer tabela selecionada e sobe a árvore
   de pais até o topo. Ancestrais cujo `type=TABLE|FORM` aponta para tabelas
   fora do pacote são exportados como `SEPARATOR`

### Erros
| Code | Cause | Quando |
|------|-------|--------|
| 400 | TABLE_SLUG_REQUIRED | Nenhum slug informado |
| 404 | TABLE_NOT_FOUND | Algum slug não corresponde a uma tabela |
| 400 | MISSING_RELATED_TABLES | Há tabelas referenciadas fora da seleção e `acknowledge` é `false`. `errors.missingTables` traz a lista separada por vírgula |
| 500 | EXPORT_TABLE_ERROR | Erro interno |

## Import

### Validator
`ImportTableValidator`:
- `fileContent` (objeto loose) — o pacote v1/v2
- `name` (string, opcional, máx 40 chars) — **legado**: renomeia a primeira
  tabela apenas em pacotes single-table
- `tables` (array opcional de `{ slug, name }`) — **renomeação por tabela**.
  `slug` é o slug **original** no pacote; `name` é o novo nome (o slug final é
  derivado via `slugify`). Tabelas ausentes do array mantêm nome/slug
  originais. Quando `tables` é enviado, `name` é ignorado.
- `menus` (array opcional de `{ slug, name }`) — **renomeação por item de
  menu**. Mesma semântica de `tables`, porém só se aplica aos **itens folha**
  em conflito: menus-pai já existentes são reaproveitados e nunca renomeados.

> **Renomear preserva relacionamentos.** Todo o fluxo de import é chaveado pelo
> `originalSlug`; renomear só troca o `newSlug`/`newName` de destino. Os campos
> RELATIONSHIP entre tabelas do pacote continuam sendo religados na Fase B com
> os novos `tableId`/slug.

> **Importação "somente dados".** Quando o pacote não traz estrutura em
> nenhuma tabela (export `exportType: 'data'`), o fluxo desvia para
> `importDataOnly`: casa cada tabela por `tableSlug` com uma tabela **já
> existente** no destino e insere as linhas (Fases C/D apenas — sem criar
> estrutura nem menus, sem renomeação). Por isso o export sempre grava
> `tableSlug`/`tableName` em cada tabela exportada (identidade), mesmo no modo
> só-dados. Tabela alvo ausente → `IMPORT_TABLES_NOT_FOUND` (`errors.tables`
> com os slugs faltantes). O frontend, ao detectar `exportType === 'data'`,
> esconde os inputs de renome e lista os slugs de destino (read-only).

### Fluxo
1. Auth + `ExtensionActiveMiddleware` (bodyLimit 50 MB)
2. Valida `header.platform === 'lowcodejs'`
3. Normaliza v1 → v2 internamente
4. Monta os mapas de renomeação `originalSlug → { name, slug }`
   (`computeRenames` para tabelas, `computeMenuRenames` para menus): API nova
   (`payload.tables` / `payload.menus`) ou campo legado (`payload.name` para
   single-table)
5. **Detecta conflitos antes de qualquer escrita** (`detectConflicts`), usando
   os slugs **já renomeados**:
   - slugs de tabelas vs. **qualquer tabela existente, inclusive na lixeira**
     (o slug é a chave da coleção dinâmica e precisa ser único) →
     `IMPORT_CONFLICTS` ou `TABLE_SLUG_ALREADY_EXISTS` (single-table sem
     conflito de menu)
   - slugs de **itens de menu folha** vs. menus existentes não-trashed →
     `IMPORT_CONFLICTS`. Menus que são **pai** de outro menu do pacote são
     ignorados aqui — serão reaproveitados na Fase E, nunca conflitam
   - slugs duplicados **entre as próprias renomeações** do pacote →
     `DUPLICATE_TABLE_SLUGS` / `DUPLICATE_MENU_SLUGS`
   - `errors.tables` / `errors.menus` carregam sempre o **slug original** do
     item em conflito, para o frontend destacar o campo certo no formulário
7. **Fase A — esqueleto das tabelas**: cria fields nativos + top-level +
   grupos. `relationship` para tabelas **dentro do pacote** fica `null`
   nesta fase. `relationship` para tabelas **fora do pacote** é resolvido
   contra o DB atual
8. **Fase B — relacionamentos do pacote**: agora que todas as tabelas existem,
   atualiza fields cujo relationship apontava para outro item do pacote (usando
   os novos `tableId`/`fieldId` — já refletindo as renomeações)
9. **Fase C — inserção de rows**: por tabela, insere cada row removendo os
   campos RELATIONSHIP (e os de subrows dos field groups). Campos USER são
   mantidos como estão; o `_originalCreator` da row vira o `creator` do
   registro inserido (cai para o usuário que importa quando ausente).
   Constrói `rowIdMap[newSlug][_originalId] = newId` — chaveado pelo slug
   **renomeado**, porque é assim que a Fase D consulta o mapa (os campos
   RELATIONSHIP já apontam para o slug novo após a Fase B)
10. **Fase D — backfill de relacionamentos**: percorre as rows e faz `update`
    substituindo os IDs originais pelos novos via `rowIdMap`. IDs cuja tabela
    referenciada não veio no pacote são mantidos como estão
11. **Fase E — menus**: cria em ordem topológica (pais antes dos filhos),
    resolvendo `tableSlug → novo tableId` e `parent → novo parentId`.
    - **Menu-pai já existente é reaproveitado**: se um menu do pacote é pai de
      outro menu do pacote e já existe um menu com aquele slug no DB, ele
      **não** é recriado — os filhos passam a apontar para o menu existente
      (não conta em `importedMenus`)
    - **Itens folha** podem ter sido renomeados (`menuRenames`) — criados com
      o novo `slug`/`name`
    - Menus `TABLE/FORM` que apontam para tabelas ausentes viram `SEPARATOR`

### Erros
| Code | Cause | Quando |
|------|-------|--------|
| 400 | OWNER_ID_REQUIRED | Owner ausente (não deveria com auth) |
| 400 | INVALID_PLATFORM | header.platform diferente de "lowcodejs" |
| 400 | TABLE_SLUG_ALREADY_EXISTS | Slug da tabela já existe — inclusive se a tabela existente está na lixeira (single-table sem conflito de menu). `errors.tables` traz o(s) slug(s) **original(is)** |
| 400 | IMPORT_CONFLICTS | Conflitos detectados (tabelas e/ou itens de menu folha). `errors.tables` e `errors.menus` trazem os slugs **originais** em conflito |
| 400 | DUPLICATE_TABLE_SLUGS | Duas tabelas do pacote gerariam o mesmo slug após renomeação. `errors.tables` traz os slugs originais colidentes |
| 400 | DUPLICATE_MENU_SLUGS | Dois itens de menu do pacote gerariam o mesmo slug após renomeação. `errors.menus` traz os slugs originais colidentes |
| 400 | STRUCTURE_REQUIRED | Arquivo sem `structure` **e** sem identidade de tabela (pacote vazio) |
| 400 | IMPORT_TABLES_NOT_FOUND | Import "somente dados": tabela(s) alvo não existe(m) no destino. `errors.tables` traz os slugs faltantes |
| 400 | DATA_TABLE_IDENTITY_MISSING | Import "somente dados" de arquivo antigo, sem `tableSlug` por tabela — reexportar |
| 500 | IMPORT_TABLE_ERROR | Erro interno |

> O frontend (`import-section.tsx`) usa esses códigos para destacar as tabelas
> **e os itens de menu** conflitantes no formulário de renomeação, já
> pré-preenchendo uma sugestão de nome. Menus-pai já existentes são
> reaproveitados automaticamente — o usuário só renomeia o item folha.

### Resposta
```jsonc
{
  "tableId": "...",        // primeira tabela (compat)
  "slug": "...",
  "importedFields": 12,
  "importedRows": 30,
  "importedMenus": 3,
  "tables": [
    { "tableId": "...", "slug": "clientes", "name": "Clientes" },
    { "tableId": "...", "slug": "pedidos",  "name": "Pedidos"  }
  ]
}
```

### Progresso em tempo real (WebSocket)

A importação emite progresso ao vivo pelo namespace Socket.IO `/table-import`
(`import-table.socket.ts`), no mesmo Socket.IO server do chat. O cliente gera
um `job_id` (UUID), abre o modal, conecta no namespace e dispara o `POST
/tools/import-table` com o mesmo `job_id`. Os eventos são emitidos na room
`user:<sub>` do usuário que importa; o frontend filtra pelos eventos cujo
`job_id` bate com o seu.

| Evento (server → client) | Payload | Quando |
|--------------------------|---------|--------|
| `progress` | `{ job_id, phase, processed, total, current_table, failed }` | A cada avanço de fase (`structure`/`rows`/`relationships`/`menus`) |
| `completed` | `{ job_id, importedFields, importedRows, importedMenus, tables }` | Import concluído com sucesso |
| `error` | `{ job_id, message }` | Falha durante a importação |

Auth do namespace via cookie `accessToken` (mesmo JWT do HTTP). `emitTableImportEvent`
é no-op quando o namespace ainda não foi inicializado (ex.: testes unitários).

## Testes
- Unit: `export-table.use-case.spec.ts`, `import-table.use-case.spec.ts`
  (cobertura inclui detecção de relationships ausentes, exportação de menus
  com ancestrais, conflitos de slug multi-recurso, importação v1/v2)
