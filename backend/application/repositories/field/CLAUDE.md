# Field Repository

Repositorio da entidade Field (campos de tabelas dinamicas).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `field-contract.repository.ts` | Classe abstrata com interface e payload types |
| `field.repository.ts` | Implementacao com Mongoose |
| `field-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IField` | Cria campo com tipo, formato, visibilidade, validacao |
| `createMany(payloads)` | `IField[]` | Cria multiplos campos de uma vez |
| `findById(_id, options?)` | `IField \| null` | Busca por _id |
| `findBySlug(slug, options?)` | `IField \| null` | Busca por slug |
| `findMany(payload)` | `IField[]` | Query com paginacao, search, filtro por type e _ids |
| `update(payload)` | `IField` | Atualiza por _id (campos parciais + trashed) |
| `delete(_id)` | `void` | Remove campo |
| `deleteMany(_ids)` | `void` | Remove multiplos campos |
| `count(payload)` | `number` | Conta campos matchando query |
| `updateRelationshipTableSlug(old, new)` | `void` | Atualiza slug da tabela em campos de relacionamento |
| `findByRelationshipTableId(tableId)` | `IField[]` | Busca campos que referenciam uma tabela |

## Payloads

- `FieldCreatePayload` - name, slug, type, required, multiple, format, `validations` (opcional, default `[]` — regras de `field.validations[]`), showIn (Filter/Form/Detail/List), widthIn (Form/List/Detail), locked, native, defaultValue, relationship, dropdown, category, group

## Comportamentos Unicos

- `createMany` e `deleteMany` para operacoes em lote
- `updateRelationshipTableSlug` mantém consistencia ao renomear tabela
- `findByRelationshipTableId` busca reversa de relacionamentos
