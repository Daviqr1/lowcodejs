---
name: code-pattern
description: TypeScript/React code style and git commit conventions — no needless ternaries, no needless `any`, no `as` type assertions, always `type` never `interface`, combine object types with `Merge` not `&`, lookup object over long if/else chains, async/await over `.then/.catch` chains, proactive atomic commits. Use whenever you write, edit, or review TS/JS/TSX/JSX in any project, and whenever you create a git commit, even if the user doesn't ask explicitly.
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

## 5. Combine tipos com `Merge`, não `&`

Para juntar tipos objeto, use o utilitário `Merge<A, B>` no lugar da interseção
`A & B`. `Merge` acha as chaves (`{ [K in keyof (A & B)]: (A & B)[K] }`),
resolvendo sobreposições e mostrando o tipo final flat no editor — em vez de uma
cadeia de `&`:

```ts
// Evitar
type Props = React.ComponentProps<'div'> & { value: string }

// Preferir
type Props = Merge<React.ComponentProps<'div'>, { value: string }>
```

Três ou mais partes aninham: `Merge<Merge<A, B>, C>`. `Merge` é um utility do
projeto (ex.: `lib/interfaces.ts` no frontend, `core/entity.core.ts` no backend)
— importe do módulo onde ele estiver definido; se não existir, defina-o.

Exceção: interseção com `Array<T>` (ex.: `Array<T> & { extra }`) mantém `&` —
`Merge` mapeia as chaves e destrói a semântica de array. Uniões (`|`) não são
interseção e seguem normais.

## 6. Lookup object no lugar de cadeia de if/else

Quando você mapeia um discriminante (uma chave, um `type`, um enum) para um valor
ou um handler em **3+ casos**, use um lookup object (mapa de despacho) no lugar de
uma cadeia de `if`/`else if` ou `switch`. Declare o mapa uma vez e indexe:

```ts
// Evitar
let label
if (type === 'A') label = 'Alpha'
else if (type === 'B') label = 'Beta'
else if (type === 'C') label = 'Gamma'
else label = 'Unknown'

// Preferir
const LABELS = { A: 'Alpha', B: 'Beta', C: 'Gamma' } as const
const label = LABELS[type] ?? 'Unknown'
```

Vale para comportamento também — mapeie a chave para uma função e chame:

```ts
const HANDLERS = {
  create: handleCreate,
  update: handleUpdate,
  remove: handleRemove,
} as const
HANDLERS[action]?.(payload)
```

O mapa lê como uma tabela, adicionar caso é uma linha, e o compilador cobra as
chaves (`Record<Key, T>`). 1–2 casos mantenha `if` simples (mapa ali é exagero).
É para despacho valor/handler por chave, não para lógica booleana arbitrária
(ranges, condições combinadas) — essa fica `if`.

## 7. async/await, nunca `.then/.catch`

Nunca encadeie `.then()` / `.catch()` / `.finally()` numa promise. Sempre `await`
dentro de uma função `async`, e trate erro com `try/catch`. Lê de cima pra baixo,
sem callbacks aninhados nem contexto de erro perdido — combina com o resto do
estilo (if clássico, nada de control flow escondido):

```ts
// Evitar
function load() {
  return fetch(url).then((r) => r.json()).catch((e) => handle(e))
}

// Preferir
async function load() {
  try {
    const r = await fetch(url)
    return await r.json()
  } catch (e) {
    handle(e)
  }
}
```

O alvo é a **cadeia** `.then().catch()`, não o objeto Promise. Combinadores
seguem válidos — `await Promise.all([...])`, `await Promise.race([...])` — desde
que você faça `await` do resultado em vez de encadear `.then` nele.

## 8. Commits: conventional, atomic, semantic

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

Reread your own diff for assignment ternaries, loose `any`, `as`, `interface` in
app code, object intersections with `&` that should be `Merge`, long if/else
chains that should be a lookup object, and `.then().catch()` chains that should be
`async/await`. Find one, fix it. Cheaper to catch now than later.
