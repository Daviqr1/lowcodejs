# Pagina de Sign-Up

Pagina de cadastro de novos usuarios. Acessivel em `/sign-up`.

## Arquivos

| Arquivo          | Responsabilidade                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| `index.tsx`      | Configuracao da rota: define `head` com titulo "Cadastro" via `createRouteHead` |
| `index.lazy.tsx` | Componente UI do formulario de cadastro (lazy loaded)                           |

## Configuracao da Rota

- **Path**: `/sign-up` (`/_authentication/sign-up/`)
- **Head/SEO**: titulo "Cadastro"
- **Sem loader ou beforeLoad** (o guard esta no layout pai)

## Componente

### Campos do Formulario

| Campo             | Tipo                           | Validacao (Zod)                                                      |
| ----------------- | ------------------------------ | -------------------------------------------------------------------- |
| `name`            | text                           | `z.string().min(1)` - obrigatorio                                    |
| `email`           | email                          | `z.string().email()` - email valido                                  |
| `password`        | password (toggle visibilidade) | `z.string().min(6)` + regex (maiuscula, minuscula, numero, especial) |
| `confirmPassword` | password (toggle visibilidade) | Deve ser igual a `password` (via `refine`)                           |

### Bibliotecas Utilizadas

- **Formulario**: `@tanstack/react-form` com `useForm`
- **Validacao**: `zod` via `FormSignUpSchema` (onChange + onSubmit)
- **Mutacao**: `useAuthenticationSignUp` de
  `@/hooks/tanstack-query/use-authentication-sign-up`
- **Erros**: `handleApiError` com `createFieldErrorSetter` para erros por campo

## Fluxo de Submissao

1. Usuario preenche nome, email, senha e confirmacao, submete o formulario
2. `confirmPassword` e removido do payload antes do envio
3. `signUpMutation.mutateAsync(data)` envia dados ao backend
4. **Sucesso**: redireciona para `/sign-up/success` (tela de confirmacao) com
   `router.navigate`; de la o CTA "Comecar" leva para `/` (login)
5. **Erro**: `handleApiError` mapeia erros por campo; tratamento especial para
   `USER_ALREADY_EXISTS` que seta erro no campo email

## Links de Navegacao

- Link para `/` ("Ja possui uma conta? Faca login")
