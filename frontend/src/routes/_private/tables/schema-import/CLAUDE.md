# Schema Import — Importação de Tabelas via YAML

Editor YAML para criar várias tabelas de uma só vez. O usuário descreve um array
`tables:` em YAML, envia para o backend e recebe o resultado por tabela
(criadas + erros parciais). Rota `/tables/schema-import`.

## Rota

| Rota                    | Descrição                                           |
| ----------------------- | --------------------------------------------------- |
| `/tables/schema-import` | Editor YAML para criar múltiplas tabelas de uma vez |

## Arquivos

| Arquivo                 | Tipo               | Descrição                                                                                            |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `index.tsx`             | Loader             | `createFileRoute` com head `Importar Schema` (apenas metadados/SEO, sem carregamento assíncrono)     |
| `index.lazy.tsx`        | Componente         | Editor Monaco (YAML, tema escuro), barra de ações, painel de referência, submit e grids de resultado |
| `-schema-reference.tsx` | Componente privado | Documentação colapsável: tipos, formatos, styles, visibilidades e propriedades de campo              |

## Fluxo

1. Usuário cola/edita o YAML no Monaco (também pode carregar `.yaml`, usar o
   exemplo ou limpar)
2. `handleSubmit()` → `schemaImport.mutate({ yaml })` (`useSchemaImport`,
   `POST /tables/schema-import`)
3. O backend processa em 2 passos: cria tabelas/campos e depois resolve
   relacionamentos cruzados; retorna `{ created, errors }`
4. A UI exibe grid verde (tabelas criadas com slug + contagem de campos + link)
   e grid vermelho (tabelas com falha + mensagem). Erros de validação aparecem
   em caixa vermelha; falhas de rede via `handleApiError()`
5. `useSchemaImport` invalida `queryKeys.tables.lists()` em caso de sucesso

## Convenções

- Editor: Monaco (`@monaco-editor/react`) com linguagem YAML, `vs-dark`, word
  wrap; altura flexível (mín. 400px)
- Validação no frontend é mínima (`!yaml.trim()` desabilita o submit); a
  validação real (sintaxe YAML + Zod) acontece no backend, que devolve erros por
  caminho de campo
- Permissão: backend exige autenticação + `CREATE_TABLE`. Sem gating de UI; a
  rota assume usuário autorizado vindo de `/tables/new`
- `-schema-reference.tsx` mantém a documentação dos tipos/formatos sincronizada
  com os enums da plataforma (`E_FIELD_TYPE`, `E_TABLE_STYLE`)
