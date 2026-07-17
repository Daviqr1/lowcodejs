# setup/admin — Criar Administrador (etapa 1)

Primeira etapa do wizard: cria a conta do usuário **MASTER** da plataforma. É o
único passo com validação de formulário robusta (Zod) e mapeamento de erros de
campo vindos da API — as demais etapas só gravam configurações.

## Arquivos

| Arquivo          | Tipo       | Descrição                                        |
| ---------------- | ---------- | ------------------------------------------------ |
| `index.tsx`      | Route      | `head` com título "Setup - Administrador"        |
| `index.lazy.tsx` | Componente | Formulário TanStack Form + `useSetupSubmitAdmin` |

## Validação (Zod)

`FormSchema` valida `name`, `email`, `password`, `confirmPassword`:

- **password**: mínimo 6 caracteres + `PASSWORD_REGEX` (1 maiúscula, 1
  minúscula, 1 número, 1 especial)
- **confirmPassword**: `.refine()` garante igualdade com `password` (erro
  ancorado em `confirmPassword`)
- Aplicado em `onChange` **e** `onSubmit`.

## Erros de Campo da API

Diferente das etapas finas (que só dão `toast.error`), aqui o `onError` usa
`handleApiError` com
`onFieldErrors: (errors) => applyApiFieldErrors(form, ...)`, projetando erros
por campo do backend (ex: email duplicado) de volta no form.
`useApiErrorAutoClear(form)` limpa esses erros conforme o usuário edita.

## Navegação

`useSetupSubmitAdmin` faz `POST /setup/admin`. No sucesso segue o padrão do
wizard: `data.completed → '/'`, senão `→ /setup/${data.currentStep}`
(normalmente `name`). Toggle de visibilidade independente para senha e
confirmação via estado local (`showPassword`, `showConfirmPassword`).
