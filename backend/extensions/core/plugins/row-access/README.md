# Plugin: row-access (Controle de Acesso a Linhas)

Plugin do pacote `core` que consolida 3 mecanismos de controle de acesso
a linhas em um único guard:

1. **Visibility por grupo** — matriz `groupMatrix: Record<valor, string[]>` onde
   `string[]` são IDs de grupo. Uma row com `visibility = RESTRITO` é visível
   apenas para usuários que pertencem a algum dos grupos listados em
   `groupMatrix.RESTRITO`.
2. **Bypass do criador** — criadores sempre veem/editam/deletam suas próprias rows,
   independentemente da visibility.
3. **Janela temporal** — `off` (padrão), `createdAt-sliding` (N dias), `createdAt-fixed`
   (intervalo de datas) ou `field-range` (campos DATE da tabela).

## Anti-lockout

O bypass de privilegiado (`ctx.isPrivileged`) no `RowAccessGuardService` garante
que MASTER e ADMINISTRATOR **nunca** são bloqueados, independentemente do
`groupMatrix` configurado.

## Settings (por tabela)

```ts
{
  visibility: {
    enabled: boolean,         // habilita/desabilita o mecanismo
    fieldSlug: string,        // slug do campo DROPDOWN na tabela (default: "visibility")
    values: string[],         // 2..8 valores UPPER_SNAKE_CASE
    groupMatrix: Record<string, string[]>,  // valor -> IDs de grupo que podem ver
    defaultValue: string,     // valor aplicado em backfill e fallback de sanitize
  },
  creatorBypass: { enabled: boolean },
  dateWindow: DateWindowSettings,  // off | createdAt-sliding | createdAt-fixed | field-range
}
```

## onTableBound

Quando vinculado a uma tabela, o plugin:
- Garante que o campo DROPDOWN de visibilidade existe (cria se necessário)
- Garante os campos DATE de janela temporal (modo `field-range`)
- Atualiza o schema da tabela se campos foram criados
- Faz backfill: rows sem o campo de visibilidade recebem o `defaultValue`

## Deployment

O plugin é registrado automaticamente pelo `RowAccessGuardService` no boot.
As dependências de repo/service são injetadas por `injectRowAccessGuardDeps(deps)`
chamado em `bin/server.ts` após o DI registry estar pronto.
