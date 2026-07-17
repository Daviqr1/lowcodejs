# Script Execution Service

Executa scripts de usuario (`beforeSave`, `afterSave`, `onLoad`) em VM
isolada do Node. APIs expostas: `field`, `context`, `email`, `users`,
`notify`, `utils`, `console`. Detalhes do sandbox em
`application/core/table/CLAUDE.md`.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `script-execution-contract.service.ts` | Abstract class: `execute(input)` |
| `script-execution.service.ts` | Implementacao default. Cria VM via `application/core/table/sandbox.ts`, valida sintaxe, roda com timeout 5s. |
| `in-memory-script-execution.service.ts` | Mock que retorna sucesso sem executar nada (usado em testes que nao validam scripts). |

## Contrato

```typescript
execute(input: {
  code: string;
  doc: Record<string, any>;
  tableSlug: string;
  fields: FieldDefinition[];
  context: ExecutionContext;
}): Promise<ExecutionResult>
```

Retorna `{ success, error?, logs[] }`. Tipos de erro:
`syntax | runtime | timeout | unknown`.

## Uso

- `table-rows/create.use-case.ts`, `update.use-case.ts`,
  `delete.use-case.ts`: chamam `execute` nos pontos `beforeSave`,
  `afterSave`, etc., baseado no `moment` do `context`.
- Logs e erros sao agregados na response do controller para debug.

DI: `injectablesHolder.injectService(ScriptExecutionContractService, NodeVmScriptExecutionService)`
