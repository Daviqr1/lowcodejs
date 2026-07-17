# Row Password Service

Hash, mascara e remove campos de senha em documentos Row de tabelas
dinamicas (campos com `format=PASSWORD`).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `row-password-contract.service.ts` | Abstract class: `hash`, `mask`, `stripMasked` |
| `row-password.service.ts` | Implementacao default usando bcrypt |
| `in-memory-row-password.service.ts` | Mock para testes |

## Contrato

```typescript
hash(payload: Record<string, any>, fields: IField[]): Promise<void>
mask(row: Record<string, any>, fields: IField[]): void
stripMasked(payload: Record<string, any>, fields: IField[]): void
```

- `hash`: substitui valores plain pelos hashes bcrypt (mutacao in-place).
- `mask`: troca hash pelo placeholder `'********'` antes de retornar para o cliente.
- `stripMasked`: remove do payload campos cujo valor seja o placeholder
  (evita re-hashar a mascara em updates).

## Uso

- `table-rows/create.use-case.ts`: chama `hash` antes de persistir.
- `table-rows/update.use-case.ts`: chama `stripMasked` no payload, depois
  `hash`. Garante que update sem alteracao de senha nao sobrescreva o hash.
- `table-rows/show.use-case.ts` e similares: chamam `mask` na resposta.

DI: `injectablesHolder.injectService(RowPasswordContractService, BcryptRowPasswordService)`
