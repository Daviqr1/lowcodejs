# Components Extensions

Painéis de UI de configuração de extensões que vivem no **core** do frontend
(diferente de `frontend/extensions/`, que é o código de UI carregado
dinamicamente de cada plugin/módulo/tool). Aqui ficam telas de configuração de
extensões que o core conhece e integra diretamente — hoje, o plugin de controle
de acesso a linhas (`row-access`).

Consumidos pela rota de workshop `/extensions`
(`routes/_private/extensions/index.lazy.tsx`).

## Subdiretorios

| Diretorio     | Descricao                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `row-access/` | Sheet de configuração do plugin Row Access Control (visibilidade por grupo, janela de data, bypass de dono) |

## Convencoes

- UI em PT-BR
- Componentes UI base de `@/components/ui` (Shadcn/Radix)
- Sem ternário de atribuição/controle, sem `any` desnecessário, sem `as` (ver
  `frontend/CLAUDE.md` › Convencoes de Codigo)
