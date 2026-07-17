# Application — Camada de Aplicação

Container principal da lógica de negócio do backend. Organiza todas as camadas
da aplicação Fastify + Mongoose.

## Estrutura

| Diretório       | Responsabilidade                                                        |
| --------------- | ----------------------------------------------------------------------- |
| `core/`         | Enums, Either pattern, exceções, validações de campo (`validations/`)   |
| `middlewares/`  | Auth JWT + controle de acesso a tabelas (middleware por rota)           |
| `model/`        | Schemas Mongoose para 14 entidades (User, Table, Field, Menu, etc.)    |
| `repositories/` | Contratos abstratos + implementações (mongoose + in-memory para testes) |
| `resources/`    | 20 recursos REST com controllers, use-cases, validators e schemas       |
| `services/`     | Serviços de domínio (email, password, permission, storage, field-validation) |
| `utils/`        | Utilitários de JWT e cookies                                            |

## Padrões

- **Either pattern**: use-cases retornam `Either<HTTPException, T>` — nunca
  lançam exceções diretamente
- **DI via fastify-decorators**: controllers são classes com decoradores `@GET`,
  `@POST`, etc., registrados via `diRegistry`
- **Separação loader/use-case**: controllers fazem apenas roteamento e validação;
  lógica de negócio fica exclusivamente nos use-cases
- **Repositórios abstratos**: código de negócio depende de interfaces, não de
  implementações concretas (facilita testes com in-memory)
