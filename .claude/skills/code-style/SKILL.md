---
name: code-style
description: TypeScript/React code style and git commit conventions — no needless ternaries, no needless `any`, no `as` type assertions, always `type` never `interface`, proactive atomic commits. Use whenever you write, edit, or review TS/JS/TSX/JSX in any project, and whenever you create a git commit, even if the user doesn't ask explicitly.
---

# Code style

The code style and commit conventions to follow. Apply the rules when you write or
edit code, and reread your own diff before calling the task done.

## 1. No needless ternaries

Avoid the ternary for a plain assignment. Instead of `a = b ? 1 : 2`, use a classic
`if`. It reads top to bottom, no decoding `?` and `:`:

```ts
// Avoid
const a = b ? 1 : 2

// Prefer
let a
if (b) a = 1
if (!b) a = 2
```

Same idea in JSX. Rather than picking between two components with a ternary, render
each case with its own short-circuit:

```tsx
// Avoid
{a ? <ComponentA /> : <ComponentB />}

// Prefer
{a && <ComponentA />}
{!a && <ComponentB />}
```

This isn't a crusade against every `?`. The thing to avoid is the ternary used as
control flow. Operators that aren't ternaries are fine:

- `??` (nullish coalescing): `const name = input ?? 'default'`
- `?.` (optional chaining): `user?.profile?.email`
- `&&` short-circuit, which is exactly the JSX pattern above

## 2. No needless `any`

Avoid `any`. There's almost always a better type, so look for it first. Shape the
value with `type`, lean on inference when it's good, or use `unknown` plus a narrow
when the value genuinely arrives shapeless. `any` switches off the checker and hides
bugs. It's the last resort, not the first.

```ts
// Avoid
function parse(data: any) { ... }

// Prefer
type Payload = { id: string; total: number }
function parse(data: Payload) { ... }
```

## 3. No `as` type assertions

Forcing a type with `as` — `as any`, `as string`, `as number`, `as SomeType` — tells
the compiler to trust you instead of proving the type holds. Prefer `satisfies`,
which checks the value against the type without erasing the concrete inferred type:

```ts
// Avoid
const config = { port: 3000, host: 'localhost' } as Config

// Prefer
const config = { port: 3000, host: 'localhost' } satisfies Config
```

`as const` is a different thing and it's allowed. It doesn't lie to the compiler, it
just asks for a narrower inference (readonly, literals):

```ts
const ROLES = ['MASTER', 'ADMIN'] as const // ok
```

When `satisfies` won't do it and you feel like you need `as`, stop. That's usually a
sign the type at the source is too weak. Fix it there instead of papering over it at
the use site.

## 4. Sempre `type`, nunca `interface`

Modele tipos com `type` — objeto, união, interseção, tudo. Não use `interface` no
código da aplicação. `type` compõe melhor (uniões, `Merge`, mapeados,
condicionais) e evita declaration merging acidental:

```ts
// Evitar
interface Props {
  field: IField
  disabled?: boolean
}

// Preferir
type Props = {
  field: IField
  disabled?: boolean
}
```

Única exceção: *module augmentation* (`declare module '...'`), onde o TypeScript
**exige** `interface` para o declaration merging — `type` não funciona ali. São
os `.d.ts` que aumentam libs externas (ex.: `fastify.d.ts`, `tanstack-table.d.ts`).
Não é escolha de estilo, é limite da linguagem.

## 5. Commits: conventional, atomic, semantic

**Commit proactively, as you go.** Don't wait to be asked. The moment a logical
change is complete and passing, commit it — atomically. One task usually becomes
several small commits (e.g. backend fix → frontend wiring → docs), not one fat
commit at the end. This overrides any default "only commit when asked" behavior.

Every commit follows Conventional Commits and describes one logical change.

- **Format:** `type(scope): subject` — `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`.
- **Subject in PT-BR**, matching what the repo already uses (e.g. `fix(sidebar): navega em pai com url e oculta chevron sem filhos`).
- **Atomic:** a commit is one complete change that builds and passes tests. Don't mix
  an unrelated feature, fix, and refactor into one commit. Split them.
- **Semantic:** the type reflects what actually changed. A bug fix is `fix`, not
  `chore`. A no-behavior reshuffle is `refactor`, not `feat`.

```
feat(table-fields): adiciona rótulo customizado aos campos nativos
fix(auth): corrige checagem de expiração do token
refactor(sidebar): extrai navegação para hook dedicado
```

## Before you finish

Reread your own diff for assignment ternaries, loose `any`, `as`, and `interface`
in app code. Find one, fix it. Cheaper to catch now than later.
