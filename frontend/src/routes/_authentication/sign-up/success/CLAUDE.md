# Sign Up — Success

Página de confirmação exibida após o cadastro bem-sucedido. Tela simples e
autocontida, sem formulário nem search params. Rota `/sign-up/success`.

## Rota

| Rota               | Descrição                               |
| ------------------ | --------------------------------------- |
| `/sign-up/success` | Confirmação de conta criada com sucesso |

## Arquivos

| Arquivo          | Tipo       | Descrição                                                                                      |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `index.tsx`      | Loader     | `createFileRoute` com head `Conta criada` (apenas metadados; sem `beforeLoad` nem loader)      |
| `index.lazy.tsx` | Componente | Badge animado com `CheckIcon`, título "Conta criada com sucesso!", subtítulo e botão "Começar" |

## Fluxo

1. `sign-up/index.lazy.tsx`, ao concluir o cadastro (`useAuthenticationSignUp`),
   navega para `/sign-up/success`
2. A página renderiza a confirmação e um único CTA "Começar" que navega para `/`
   com `replace: true` (via `useRouter()`)

## Convenções

- Não usa search params nem `auth-shell`; layout flex centralizado standalone
- Guard de autenticação herdado do `_authentication/layout.tsx` (redireciona
  usuários já autenticados)
- test-ids: `sign-up-success-page`, `sign-up-success-start-btn`
- Não exibe nota de verificação de e-mail — apenas mensagem de boas-vindas
