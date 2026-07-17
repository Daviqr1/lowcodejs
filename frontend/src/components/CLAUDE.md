# components — Componentes React

Dois grupos de componentes com responsabilidades distintas.

## Estrutura

| Diretório | Responsabilidade                                                           |
| --------- | -------------------------------------------------------------------------- |
| `ui/`     | Design system: 36 componentes base (shadcn/Radix UI) sem lógica de negócio |
| `common/` | Componentes de negócio: 24 subdiretórios com funcionalidades da plataforma |

## Padrão `ui/`

- Componentes primitivos (Button, Input, Dialog, Sidebar, Card, etc.)
- Estilização via CVA (`class-variance-authority`) para variantes
- `data-slot` attribute em elementos raiz para hooks de CSS
- `asChild` pattern via `@radix-ui/react-slot`
- Sem dependência de stores, hooks de API ou lógica de domínio

## Padrão `common/`

- Cada subdiretório tem seu próprio `CLAUDE.md` com documentação detalhada
- Importam de `ui/` mas nunca o contrário
- O subdiretório mais complexo é `dynamic-table/` (9 subdirs) — sistema central
  de tabelas dinâmicas do low-code
