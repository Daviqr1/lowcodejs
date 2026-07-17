---
name: sheet-pattern
description: >-
  Padrão único de componentes Sheet (drawer lateral) do frontend LowCodeJS.
  Use SEMPRE que criar, editar ou revisar qualquer Sheet no frontend
  (`@/components/ui/sheet`) — drawers de formulário, painéis laterais, sheets de
  config, gerenciamento de campos, filtros, e qualquer coisa que abra da borda
  da tela. Também dispare quando o usuário falar em "drawer", "painel lateral",
  "sheet", ou pedir para padronizar/revisar sheets existentes. Há UM único
  padrão válido (trigger-forward + `ref`), definido em
  `src/components/common/sheet-example.tsx` — siga-o exatamente, não improvise
  outra forma. Modal central usa [[dialog-pattern]].
---

# Padrão de Sheet — LowCodeJS Frontend

`Sheet` é o drawer lateral do projeto (`@/components/ui/sheet`, wrapper do Radix
Dialog). Existe **UM único padrão**, definido na referência
`src/components/common/sheet-example.tsx`. Não há variação, não há "modelo
alternativo": todo Sheet novo copia essa forma.

## A referência (fonte da verdade)

`src/components/common/sheet-example.tsx`:

```tsx
import type { Merge } from '@/lib/interfaces';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

type SheetExampleProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  { fieldId?: string }
>;

export function SheetExample({
  ref,
  ...rest
}: SheetExampleProps): React.JSX.Element {
  return (
    <Sheet>
      <SheetTrigger
        {...rest}
        ref={ref}
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          {/* campos */}
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

## As regras (todas obrigatórias)

1. **Trigger-forward + `ref`.** O componente tipa as props como
   `Merge<React.ComponentProps<typeof SheetTrigger>, { ...extras }>`, desestrutura
   `{ ref, ...rest }` e espalha `<SheetTrigger {...rest} ref={ref} />`. Quem usa o
   Sheet passa o próprio gatilho (`asChild`) ou dispara por
   `ref.current?.click()` a partir de menu/linha de tabela. O `<Sheet>` é
   **uncontrolled** — abre/fecha pelo Radix + `SheetClose`. Não use
   `open`/`onOpenChange`.
2. **Header sempre com `SheetTitle` E `SheetDescription`** (a11y — Radix anuncia
   os dois). Oculto = `className="sr-only"`, nunca omitir.
3. **Corpo** em `<div className="grid flex-1 auto-rows-min gap-6 px-4">`; para
   formulário use `Field`/`FieldGroup`/`FieldLabel`/`FieldError`
   (`@/components/ui/field`) + `InputGroup*` quando houver ícone/addon.
4. **Footer** com a ação primária + `SheetClose asChild` no cancelar/fechar.
   Nunca `onClick={() => onOpenChange(false)}`.
5. **Retorno tipado `React.JSX.Element`**. Se o arquivo não tem React em escopo,
   `import type * as React from 'react'`.
6. **Code-style** (ESLint): sem ternário de controle, sem `any`/`as`, `type` nunca
   `interface`, `Merge` no lugar de `&`, lookup object em 3+ casos. Ver
   `code-pattern`.

## Como o caller abre o Sheet

> **REGRA DE OURO — zero botão escondido.** Em lugar nenhum do padrão existe
> `<button className="hidden">`, `aria-hidden`, `sr-only` num gatilho, nem
> `asChild` embrulhando um elemento oculto. Só há dois jeitos de abrir/fechar:
> (a) um elemento **visível** via `asChild` (`<XSheet asChild><Button>…</Button>`),
> ou (b) o componente **nu** disparado por `ref` (`<XSheet ref={ref} />`). Se te
> pegar querendo esconder um botão pra segurar um ref, pare: use o nu (abrir) ou
> ancore o ref no botão visível que já existe (fechar). Ver os exemplos
> `sheet-example.tsx` (`SheetExample asChild` + `DropdownMenuExample`/
> `TableExample` que abrem por `ref.current?.click()`).

7. **Gatilho nu quando abre por `ref` (menu/linha/programático).** Renderize o
   componente **nu**: `<XSheet ref={triggerRef} ...props />` (autofechado, sem
   filhos). O `<SheetTrigger>` sem filho já é o botão que `triggerRef.current?.click()`
   aciona. **NUNCA** `asChild` + `<button className="hidden" aria-hidden />` —
   `asChild` sem um filho visível não existe. Use `asChild` **só** quando o próprio
   elemento visível é o gatilho (`<XSheet asChild><Button>…</Button></XSheet>`).
8. **Fechar no sucesso da mutation (sem `useState`, uncontrolled).** Hook
   `useDismissableDialog()` (`@/hooks/use-dismissable-dialog`) → `{ closeRef, close }`.
   Ancore o `closeRef` no **botão de fechar visível** do footer
   (`<SheetClose asChild><Button ref={closeRef}>Cancelar</Button></SheetClose>`) e
   chame `close()` no `onSuccess`/após `await onSubmit`. **PROIBIDO** um
   `<SheetClose className="hidden" />` só pra segurar o ref — reaproveite o
   Cancelar/Fechar que já existe; se não houver botão de fechar visível, adicione
   um (Fechar) em vez de esconder. Erro mantém aberto (toast reporta).
   Caller dono da mutation: sheet expõe `onConfirm: (close) => void` e o caller
   fecha via **`mut.mutateAsync(vars, { onSuccess: close })`** (callback da própria
   mutation; sem args → `mutateAsync(undefined, { onSuccess: close })`). **NUNCA**
   `mutateAsync(...).then(close).catch(() => {})` nem `void` na frente. Form dentro
   do sheet: `await onSubmit(payload); close();`.
9. **Alvo dinâmico aberto de menu/linha (qual item).** No caller: estado
   `{ alvo, nonce }` + `triggerRef` + `useEffect` que clica o ref quando muda +
   `<XSheet key={nonce} ref={triggerRef} … />`. O `key` remonta e evita prop
   stale; o `nonce` permite reabrir o mesmo item.
10. **Conteúdo com data-on-open ou reset por abertura.** Extraia um componente
    **interno** renderizado dentro do `<SheetContent>` (Radix monta o content só
    quando aberto → form/estado self-inicializa e reseta ao fechar; dispensa
    effect keyado em `open`). Passe `close` p/ o interno.
11. **`Merge` intersecta chaves em conflito** (não sobrescreve): se uma prop colide
    com atributo DOM do trigger (`onSubmit`, `onError`, `title`…), faça
    `Omit<React.ComponentProps<typeof SheetTrigger>, 'onSubmit'>` antes do `Merge`.

## Antes de terminar

Releia o diff: props via `Merge<React.ComponentProps<typeof SheetTrigger>, …>`;
`{ ref, ...rest }` no `SheetTrigger`; sem `open`/`onOpenChange`; header com Title
**e** Description; footer com `SheetClose asChild`; retorno `React.JSX.Element`;
**gatilho nu `<XSheet ref={ref} />` sem hidden-button**; fechar via
`useDismissableDialog`. Rode `npm run lint` e `npx tsc --noEmit` no `frontend/`.
