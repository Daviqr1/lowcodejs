# Setting Repository

Repositorio da entidade Setting (configuracoes globais do sistema).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `setting-contract.repository.ts` | Classe abstrata com interface e payload types |
| `setting.repository.ts` | Implementacao com Mongoose |
| `setting-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `get()` | `ISetting \| null` | Retorna o documento unico de configuracao (com populate em MODEL_CLONE_TABLES) |
| `update(payload)` | `ISetting` | Atualiza configuracao (upsert: cria se nao existir) |

## Comportamentos Unicos

- Pattern diferente dos outros repositorios: nao possui `create`, `findBy`, `findMany`, `delete`, `count`
- Documento singleton (apenas um registro no banco)
- `update` usa `findOneAndUpdate` com `upsert: true`
- `MODEL_CLONE_TABLES` e um array de refs para tabelas (populated no get/update)
- `SettingUpdatePayload` usa `Partial<ISetting>` com MODEL_CLONE_TABLES como `string[]`
