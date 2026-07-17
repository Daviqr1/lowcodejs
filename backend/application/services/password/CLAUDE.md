# Password Service

Servico de hashing e comparacao de senhas.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `password-contract.service.ts` | Classe abstrata com decorator `@Service()` |
| `password.service.ts` | Implementacao com bcrypt |
| `in-memory-password.service.ts` | Mock para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `hash(password)` | `string` | Gera hash bcrypt da senha |
| `compare(plain, hashed)` | `boolean` | Compara senha plain text com hash |
