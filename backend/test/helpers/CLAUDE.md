# test/helpers — Utilitários de Teste

Helpers compartilhados pelos testes E2E e unitários: autenticação, factories de
tabelas e campos.

## Arquivos

| Arquivo                    | Descrição                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `auth.helper.ts`           | `createAuthenticatedUser()` cria user+grupo+permissões, faz sign-in, retorna cookies + dados do usuário. `cleanDatabase()` limpa coleções User e UserGroup |
| `field-factory.helper.ts`  | Factories para criar campos de cada tipo (`E_FIELD_TYPE`) com valores padrão      |
| `table-factory.helper.ts`  | Factories para criar estruturas de tabela com campos pré-configurados              |

## Padrões de Uso

- **Testes E2E** (`*.e2e.spec.ts`): usam `createAuthenticatedUser()` para obter
  cookies de sessão reais e executar requests autenticados contra o servidor real
- **Testes unitários** (`*.spec.ts`): usam factories + repositórios in-memory,
  sem dependência de MongoDB real
- `createAuthenticatedUser()` cria grupo MASTER com 18 permissões por padrão
  (12 de tabela + 6 capacidades de área, sem MANAGE_CHAT), simplificando setup
  de testes que não testam RBAC
- Factories aceitam partial overrides para customizar apenas os campos relevantes
  ao teste
