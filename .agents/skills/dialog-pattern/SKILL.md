---
name: dialog-pattern
description: >-
  Padrão único de componentes Dialog (modal central) do frontend LowCodeJS.
  Use SEMPRE que criar, editar ou revisar qualquer Dialog no frontend
  (`@/components/ui/dialog`) — modais de formulário, confirmações, detalhe,
  config, import/export, e qualquer coisa que abra centralizado sobre overlay.
  Também dispare quando o usuário falar em "dialog", "modal", "confirmação",
  "popup", ou pedir para padronizar/revisar dialogs existentes. Há UM único
  padrão válido (trigger-forward + `ref`), definido em
  `src/components/common/dialog-example.tsx` — siga-o exatamente, não improvise
  outra forma. Drawer lateral usa [[sheet-pattern]].
---

# Padrão de Dialog — LowCodeJS Frontend

`Dialog` é o modal central do projeto (`@/components/ui/dialog`, wrapper do Radix
Dialog). Existe **UM único padrão**, definido na referência
`src/components/common/dialog-example.tsx`. Não há variação, não há "modelo
alternativo": todo Dialog novo copia essa forma. É o irmão do [[sheet-pattern]]
— mesma forma, componente diferente.

## A referência (fonte da verdade)

`src/components/common/dialog-example.tsx`:

```tsx
import type { Merge } from '@/lib/interfaces';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

type DialogExampleProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { fieldId?: string }
>;

export function DialogExample({
  ref,
  ...rest
}: DialogExampleProps): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          {/* campos */}
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## As regras (todas obrigatórias)

1. **Trigger-forward + `ref`.** O componente tipa as props como
   `Merge<React.ComponentProps<typeof DialogTrigger>, { ...extras }>`,
   desestrutura `{ ref, ...rest }` e espalha `<DialogTrigger {...rest} ref={ref} />`.
   Quem usa o Dialog passa o próprio gatilho (`asChild`) ou dispara por
   `ref.current?.click()` a partir de menu/linha. O `<Dialog>` é **uncontrolled**
   — abre/fecha pelo Radix + `DialogClose`. Não use `open`/`onOpenChange`.
2. **Header sempre com `DialogTitle` E `DialogDescription`** (a11y — Radix anuncia
   os dois). Oculto = `className="sr-only"`, nunca omitir.
3. **Corpo** em `<div className="grid flex-1 auto-rows-min gap-6 px-4">`; para
   formulário use `Field`/`FieldGroup`/`FieldLabel`/`FieldError`
   (`@/components/ui/field`) + `InputGroup*` quando houver ícone/addon.
4. **Footer** com a ação primária + `DialogClose asChild` no cancelar/fechar.
   Nunca `onClick={() => onOpenChange(false)}`.
5. **Retorno tipado `React.JSX.Element`**. Se o arquivo não tem React em escopo,
   `import type * as React from 'react'`.
6. **Code-style** (ESLint): sem ternário de controle, sem `any`/`as`, `type` nunca
   `interface`, `Merge` no lugar de `&`, lookup object em 3+ casos. Ver
   `code-pattern`.

## Como o caller abre o Dialog

> **REGRA DE OURO — zero botão escondido.** Em lugar nenhum do padrão existe
> `<button className="hidden">`, `aria-hidden`, `sr-only` num gatilho, nem
> `asChild` embrulhando um elemento oculto. Só há dois jeitos de abrir/fechar:
> (a) um elemento **visível** via `asChild` (`<XDialog asChild><Button>…</Button>`),
> ou (b) o componente **nu** disparado por `ref` (`<XDialog ref={ref} />`). Se te
> pegar querendo esconder um botão pra segurar um ref, pare: use o nu (abrir) ou
> ancore o ref no botão visível que já existe (fechar). Ver os exemplos
> `dialog-example.tsx` (`DialogExample asChild` + `DropdownMenuExample`/
> `TableExample` que abrem por `ref.current?.click()`).

7. **Gatilho nu quando abre por `ref` (menu/linha/programático).** Renderize o
   componente **nu**: `<XDialog ref={triggerRef} ...props />` (autofechado, sem
   filhos). O `<DialogTrigger>` sem filho já é o botão que `triggerRef.current?.click()`
   aciona. **NUNCA** `asChild` + `<button className="hidden" aria-hidden />` —
   `asChild` sem um filho visível não existe. Use `asChild` **só** quando o próprio
   elemento visível é o gatilho (`<XDialog asChild><Button>…</Button></XDialog>`).
8. **Fechar no sucesso da mutation (sem `useState`, uncontrolled).** Hook
   `useDismissableDialog()` (`@/hooks/use-dismissable-dialog`) → `{ closeRef, close }`.
   Ancore o `closeRef` no **botão de fechar visível** do footer
   (`<DialogClose asChild><Button ref={closeRef}>Cancelar</Button></DialogClose>`) e
   chame `close()` no `onSuccess`/após `await onSubmit`. **PROIBIDO** um
   `<DialogClose className="hidden" />` só pra segurar o ref — reaproveite o
   Cancelar/Fechar que já existe; se não houver botão de fechar visível, adicione
   um (Fechar) em vez de esconder. Erro mantém aberto (toast reporta).
   Caller dono da mutation: dialog expõe `onConfirm: (close) => void` e o caller
   fecha via **`mut.mutateAsync(vars, { onSuccess: close })`** (callback da própria
   mutation; sem args → `mutateAsync(undefined, { onSuccess: close })`). **NUNCA**
   `mutateAsync(...).then(close).catch(() => {})` nem `void` na frente. Form dentro
   do dialog: `await onSubmit(payload); close();`.
9. **Alvo dinâmico aberto de menu/linha (qual item).** No caller: estado
   `{ alvo, nonce }` + `triggerRef` + `useEffect` que clica o ref quando muda +
   `<XDialog key={nonce} ref={triggerRef} … />`. O `key` remonta e evita prop
   stale; o `nonce` permite reabrir o mesmo item.
10. **Conteúdo com data-on-open ou reset por abertura.** Extraia um componente
    **interno** renderizado dentro do `<DialogContent>` (Radix monta o content só
    quando aberto → form/estado self-inicializa e reseta ao fechar; dispensa
    effect keyado em `open`). Passe `close` p/ o interno.
11. **View-only auto-aberto por URL/estado** (sem gatilho): `<Dialog defaultOpen>`
    + `DialogClose` no botão; efeitos colaterais de fechar via `onEscapeKeyDown`/
    `onPointerDownOutside` no `DialogContent`.
12. **`Merge` intersecta chaves em conflito** (não sobrescreve): se uma prop colide
    com atributo DOM do trigger (`onSubmit`, `onError`, `title`…), faça
    `Omit<React.ComponentProps<typeof DialogTrigger>, 'onSubmit'>` antes do `Merge`.

## Antes de terminar

Releia o diff: props via `Merge<React.ComponentProps<typeof DialogTrigger>, …>`;
`{ ref, ...rest }` no `DialogTrigger`; sem `open`/`onOpenChange`; header com Title
**e** Description; footer com `DialogClose asChild`; retorno `React.JSX.Element`;
**gatilho nu `<XDialog ref={ref} />` sem hidden-button**; fechar via
`useDismissableDialog`. Rode `npm run lint` e `npx tsc --noEmit` no `frontend/`.
