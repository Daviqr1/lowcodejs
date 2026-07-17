# Table Builders

Classes Mongoose para construcao de schemas, modelos, queries, populates e
transformacao de rows de tabelas dinamicas. Cada uma tem **contrato**
(`*-contract.service.ts`) + impl `@Service()` (+ um in-memory para testes),
registrados em `di-registry.ts` e injetados por **constructor injection**.
Consumidores: repos `*-mongoose` e os use-cases de `table-fields`,
`table-group-fields`, `table-base` e `table-rows`.

> Importar o contrato pelo **caminho direto** do modulo, nunca pelo barrel
> `index.ts` — senao o SWC elide o tipo do parametro e a injecao falha
> silenciosamente. Ver [[project-di-pattern]].

## Arquivos

Cada impl e `@Service() export default class` (registrada pelo scanner do
`di-registry.ts` via a convencao `<base>-contract.service.ts` ↔
`<base>.service.ts`). **Nao ha mais barrel `index.ts`** — importe sempre pelo
caminho direto do arquivo.

| Arquivo | Classe | Metodos publicos | Descricao |
|---------|--------|------------------|-----------|
| `schema-builder.service.ts` | `MongooseSchemaBuilder` | `build(fields, groups?)` | Converte `IField[]` em `ITableSchema` (definicao Mongoose) |
| `model-builder.service.ts` | `MongooseModelBuilder` | `build(table)` | Cria modelo Mongoose dinamico a partir de `ITable` na conexao **data** (`getDataConnection()` resolvido internamente). Registra hooks beforeSave/afterSave. Exporta tambem `type Entity` (named) |
| `populate-builder.service.ts` | `MongoosePopulateBuilder` | `build(...)`, `getRelationships(fields?)` | Gera populate paths para relacionamentos, incluindo reverse relationships |
| `query-builder.service.ts` | `MongooseQueryBuilder` | `build(...)`, `order(...)`, `normalize(s)` | Converte filtros de busca em query MongoDB, com suporte a embedded docs. Exporta tambem `type Query`/`type QueryOrder` (named) |
| `row-context-builder.service.ts` | `RowContextBuilder` | `transform(row, fields, userId?)` | Agrega reaction/evaluation em campos computados da row |

## Uso

Injetar o **contrato** por constructor (import direto, nunca barrel):

```typescript
import { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';

@Service()
export default class TableFieldCreateUseCase {
  constructor(
    private readonly schemaBuilder: SchemaBuilderContractService,
    private readonly modelBuilder: ModelBuilderContractService,
  ) {}

  async execute(/* ... */): Promise<Response> {
    const _schema = this.schemaBuilder.build(fields, groups);
    // ...persistir _schema...
    await this.modelBuilder.build(table); // recompila o model na conexao data
  }
}
```

Consumidores: `repositories/row/row.repository.ts` (model, query,
populate), os use-cases de `table-fields`/`table-group-fields`/`table-base`
(schema + model) e `table-rows` (row-context), e os repos `*.repository` de
entidade que usam `MongooseQueryBuilder.normalize` na busca.
