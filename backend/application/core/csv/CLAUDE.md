# CSV — Utilitários de Exportação

Helpers puros para exportar rows de tabela dinâmica em CSV. Agnósticos de HTTP;
consumidos pelos use-cases de exportação (ex.: `table-rows`).

## Arquivos

| Arquivo           | Responsabilidade                                                                 |
| ----------------- | -------------------------------------------------------------------------------- |
| `csv-filename.ts` | `buildCsvFilename(prefix, date?)` → nome padronizado `<prefix>-YYYY-MM-DD.csv`. Normaliza o prefixo (minúsculas, espaços/underscores → `-`, remove acentos/símbolos); fallback `export` se vazio |
| `csv-format.ts`   | `formatCellValue(value, ctx?)` converte qualquer valor em texto seguro para CSV (datas → ISO, arrays → `; `, objetos populados → display, HTML → texto plano). `getFieldType(fields, slug)` resolve o tipo pelo slug |
| `csv-stream.ts`   | `iterateInBatches()` + `buildCsvStream()` — streaming sem carregar tudo em memória |

## Streaming (`csv-stream.ts`)

- `EXPORT_CSV_LIMIT = 500_000` — teto de linhas por exportação.
- `iterateInBatches({ payload, fetchBatch, batchSize?, limit? })` — async
  generator que pagina via `fetchBatch(payload, page, perPage)` em batches
  sequenciais (default 1000). Ao passar de `limit` lança `ExportLimitExceededError`
  (cause `EXPORT_LIMIT_EXCEEDED`). Defesa em profundidade: o use-case deve checar
  `count()` antes para falhar cedo com 422.
- `buildCsvStream({ source, fields, delimiter? })` → `Readable` com BOM UTF-8 e
  cabeçalho, via `@json2csv/node` (`AsyncParser`). O input é embrulhado em
  `Readable.from(source, { objectMode: true })` por causa do despacho de
  AsyncIterable da lib. `parse()` retorna `JSON2CSVNodeTransform` (extends
  `Transform` → `Readable`), então o retorno é atribuível a `Readable` sem
  asserção.

## Rótulo de relacional (`csv-format.ts`)

`pickRelationDisplay` tenta, em ordem: `name`, `title`, `label`, `email`, `slug`
e cai para `_id`. Campos `FILE` resolvem para `originalName` ou `url` (conforme
`preferUrlForFiles`); `TEXT_LONG` passa por `stripHtml`.
