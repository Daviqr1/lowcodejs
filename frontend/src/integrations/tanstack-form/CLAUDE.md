# Sistema de Formularios TanStack Form

Configuracao central do sistema de formularios usando `createFormHook` do
TanStack React Form. Exporta `useAppForm` e `withForm` como pontos de entrada
para todos os formularios da aplicacao.

## Arquivos

| Arquivo                       | Descricao                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `form-hook.ts`                | Cria o hook principal com `createFormHook`, registrando todos os field components e exportando `useAppForm` e `withForm`               |
| `form-context.ts`             | Cria os contextos React com `createFormHookContexts`, exportando `fieldContext`, `formContext`, `useFieldContext` e `useFormContext`   |
| `use-field-validation.ts`     | Hook utilitario que encapsula logica de validacao de campo (touched + invalid)                                                         |
| `use-api-error-auto-clear.ts` | Observa `state.values` (useStore) e limpa os erros do slot `onServer` do errorMap via `clearApiFieldErrors` quando qualquer campo muda |

## useAppForm e withForm

- `useAppForm` - hook para criar instancia do formulario dentro de componentes
- `withForm` - HOC para componentes que recebem o formulario como prop
- Ambos sao gerados por `createFormHook` com os contextos e componentes
  registrados

## Registro de Field Components

Todos os componentes de campo sao registrados em `form-hook.ts` via propriedade
`fieldComponents` do `createFormHook`. Os componentes vem organizados em 4
categorias no subdiretorio `fields/`:

| Categoria                  | Arquivo                  | Quantidade     |
| -------------------------- | ------------------------ | -------------- |
| Campos basicos             | `fields/base.ts`         | 14 componentes |
| Campos pesados (rich)      | `fields/rich.ts`         | 2 componentes  |
| Configuracao de tabela     | `fields/table-config.ts` | 18 componentes |
| Input de dados de registro | `fields/table-row.ts`    | 9 componentes  |

## Padrao de Validacao

O hook `useFieldValidation` retorna um objeto com:

- `field` - instancia do campo via `useFieldContext`
- `isInvalid` - `true` quando campo foi tocado (`isTouched`) e nao e valido
  (`!isValid`)
- `errors` - array de strings com mensagens de erro

## Padrao de Uso

Formularios usam o padrao `form.AppForm` + `form.AppField`:

- `form.AppForm` renderiza o formulario com `onSubmit`
- `form.AppField` renderiza campos individuais referenciando os componentes
  registrados em `fieldComponents`
- Cada campo registrado fica disponivel como `children` do `AppField`
