# Confirm Dialog

Dialog de confirmação genérico, **presentacional e controlado**. Interpõe um
passo de confirmação (Cancelar / Confirmar) antes de uma ação, sem executar a
ação nem possuir mutation própria.

## Diferença dos outros dialogs

| Componente                        | Dono da mutation? | Uso                                    |
| --------------------------------- | ----------------- | -------------------------------------- |
| `action-dialog`                   | Sim (interno)     | CRUD reversível com trigger + config   |
| `permanent-delete-confirm-dialog` | Não (captcha)     | Exclusão irreversível com math captcha |
| `confirm-dialog`                  | **Não**           | Confirmação leve; caller controla ação |

Use `confirm-dialog` quando a ação já vive num hook/mutation existente (ex.:
`useAuthenticationSignOut`) e você só precisa de um gate de confirmação.

## Arquivos

| Arquivo              | Descrição                             |
| -------------------- | ------------------------------------- |
| `confirm-dialog.tsx` | Componente controlado + footer padrão |
| `index.ts`           | Barrel                                |

## Props

```ts
type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isPending: boolean; // disable dos botões + spinner no confirmar
  onConfirm: () => void; // caller dispara a ação/mutation
  confirmLabel?: string; // default 'Sair'
  cancelLabel?: string; // default 'Cancelar'
  icon?: React.ReactNode; // ícone opcional no título
  testId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
};
```

## Padrões aplicados

- Sem `any`, sem `as`, sem ternário — render condicional via `{cond && <X/>}`,
  defaults via `??`.
- Cancelar usa `DialogClose asChild` + `Button variant="outline"`.
- Confirmar usa `Button variant="destructive"` (vermelho) com spinner
  `LoaderCircleIcon` durante `isPending`.
- Mensagens em PT-BR (definidas pelo caller).

## Casos de uso

- Logout no `layout/sidebar.tsx` e `layout/profile.tsx` (sair desta conta / sair
  de todas), ligando as mutations `signOut` já existentes.
