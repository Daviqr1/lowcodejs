# setup — Wizard de Onboarding

Assistente de configuração inicial da plataforma, exibido na primeira execução
(quando ainda não existe usuário MASTER). Conduz o operador por 7 etapas
sequenciais que criam o administrador e gravam as configurações de domínio no
documento Setting do MongoDB. Fora do layout privado: usa `AuthShell` próprio,
sem sidebar nem guarda de autenticação.

## Gating (SETUP_COMPLETED)

O `layout.tsx` busca `setupStatusOptions()` (`GET /setup/status`,
`staleTime: 0`) no `beforeLoad`:

- Se `status.completed === true` → `redirect({ to: '/' })`. Todo o `/setup/*`
  fica inacessível após o setup terminar (`SETUP_COMPLETED` no Setting).
- O backend rastreia `status.currentStep` (`SETUP_CURRENT_STEP`). Se a rota
  pedida estiver **à frente** da etapa atual, redireciona para
  `/setup/${currentStep}` com `?blocked=<etapa>` — o `BlockedDialog` avisa que a
  etapa ainda não está disponível. Não dá para pular etapas pela URL.

A ordem canônica vive em `SETUP_STEPS` (`@/lib/constant`); labels em
`SETUP_STEP_LABELS`; próximo passo em `SETUP_NEXT_STEP`. O tipo `SetupStep` e
`ISetupStatus` ficam em `@/lib/interfaces`.

## Passos

| #   | Rota             | Etapa         | Coleta                                                              | Doc                 |
| --- | ---------------- | ------------- | ------------------------------------------------------------------- | ------------------- |
| 1   | `/setup/admin`   | Administrador | Nome, email, senha (+ confirmação) do usuário MASTER                | `admin/CLAUDE.md`   |
| 2   | `/setup/name`    | Identidade    | `SYSTEM_NAME` + `LOCALE` (pt-br / en-us)                            | `name/CLAUDE.md`    |
| 3   | `/setup/storage` | Armazenamento | `STORAGE_DRIVER` (local/s3) + credenciais S3 condicionais           | `storage/CLAUDE.md` |
| 4   | `/setup/logos`   | Logos         | `LOGO_SMALL_URL` + `LOGO_LARGE_URL` (upload, opcional)              | `logos/CLAUDE.md`   |
| 5   | `/setup/upload`  | Uploads       | `FILE_UPLOAD_MAX_SIZE`, `FILE_UPLOAD_ACCEPTED`, `MAX_FILES`         | `upload/CLAUDE.md`  |
| 6   | `/setup/paging`  | Paginação     | `PAGINATION_PER_PAGE` (10/20/30/40/50)                              | `paging/CLAUDE.md`  |
| 7   | `/setup/email`   | Email         | SMTP `HOST`/`PORT`/`USER`/`PASSWORD`/`FROM` (opcional, com "Pular") | `email/CLAUDE.md`   |

## Fluxo de Navegação

Cada etapa tem seu próprio hook de mutation (`useSetupSubmit*` em
`@/hooks/tanstack-query`) que faz `POST /setup/<etapa>`. O `onSuccess` recebe o
status atualizado e decide o destino de forma uniforme:

```ts
if (data.completed)
  router.navigate({ to: '/' }); // último passo
else if (data.currentStep)
  router.navigate({ to: `/setup/${data.currentStep}` });
```

Ou seja, o **backend** dita qual a próxima etapa — o frontend só obedece ao
`currentStep` retornado. O `Stepper` (`-stepper.tsx`) renderiza o progresso
visual a partir de `SETUP_STEPS`, marcando completed / active / pending.

## Arquivos da Raiz

| Arquivo               | Tipo               | Descrição                                                         |
| --------------------- | ------------------ | ----------------------------------------------------------------- |
| `layout.tsx`          | Layout + guard     | `beforeLoad` de gating, `AuthShell`, `Stepper`, `Outlet`, dialog  |
| `-stepper.tsx`        | Componente privado | Barra de progresso (completed/active/pending) sobre `SETUP_STEPS` |
| `-blocked-dialog.tsx` | Componente privado | Dialog para `?blocked=<etapa>` (etapa adiantada bloqueada)        |

## Convenções

- Cada etapa: `index.tsx` (head/title via `createRouteHead`) + `index.lazy.tsx`
  (componente). Componentes privados prefixados com `-`.
- Cards de formulário são flat (`border-0 shadow-none`).
- Toda etapa tem seu próprio leaf CLAUDE.md. As etapas "finas" (name, paging,
  email) são formulários simples com estado local via `useState`; as demais
  (admin, storage, logos, upload) têm lógica própria documentada em detalhe.
