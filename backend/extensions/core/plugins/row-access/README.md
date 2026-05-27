# Plugin: Controle de Acesso a Linhas (`core:row-access`)

Plugin único que aplica **três regras de acesso a linhas** em qualquer tabela
do LowCodeJS, configuráveis por tabela. Consolida o que antes eram 3 plugins
separados (visibility-by-role + creator-bypass + date-window-guard).

## Regras

### 1. Visibilidade por papel (opt-in)

Define uma **matriz de quais roles veem quais valores** de um campo
`visibility` (DROPDOWN). Os valores são livres (UPPER_SNAKE_CASE) e a matriz
controla:

- Quem **vê** rows com cada valor (filtro de leitura)
- Quem **pode definir** cada valor ao criar/editar (sanitize de escrita)

**Invariantes:**
- 2 a 8 valores por tabela
- Cada valor deve listar pelo menos MASTER e ADMINISTRATOR (anti-lockout)
- `defaultValue` (usado no backfill e ao normalizar payload) deve estar em `values`

### 2. Bypass do criador (opt-in)

Quando habilitado, o criador da row **sempre vê** sua própria row e pode
editá-la/deletá-la, independentemente da matriz de visibilidade. Implementado
como `$or` no `adjustListQuery` e `allow` (que vence `deny`) no `canRead`.

### 3. Janela temporal (opt-in via mode)

4 modos:

| Mode | Comportamento |
|------|---------------|
| `off` | Sem filtro temporal (default) |
| `createdAt-sliding` | Rows criadas nos últimos `slidingDays` dias |
| `createdAt-fixed` | Rows com `createdAt` em `[fixedFrom, fixedTo]` |
| `field-range` | Rows com `[validFromSlug] <= now <= [validUntilSlug]` (cria os fields DATE automaticamente) |

## Admin bypass

`MASTER` e `ADMINISTRATOR` **pulam todos os 3 módulos** — decidido globalmente
em `RowAccessGuardService.bypassAdmin`. O plugin nunca recebe esses roles em
runtime.

## Settings

Schema canônico em `settings-schema.ts`. Exemplo:

```json
{
  "visibility": {
    "enabled": true,
    "fieldSlug": "visibility",
    "values": ["PUBLIC", "INTERNO", "RESTRITO", "SIGILOSO"],
    "roleMatrix": {
      "PUBLIC":   ["MASTER", "ADMINISTRATOR", "MANAGER", "REGISTERED"],
      "INTERNO":  ["MASTER", "ADMINISTRATOR", "MANAGER"],
      "RESTRITO": ["MASTER", "ADMINISTRATOR", "MANAGER"],
      "SIGILOSO": ["MASTER", "ADMINISTRATOR"]
    },
    "defaultValue": "PUBLIC"
  },
  "creatorBypass": { "enabled": true },
  "dateWindow": { "mode": "createdAt-sliding", "slidingDays": 30 }
}
```

Defaults exportados em `DEFAULT_ROW_ACCESS_SETTINGS` (mesma estrutura acima).

## Como configurar

1. Como MASTER, abra `/extensions`
2. Ative o plugin "Controle de Acesso a Linhas"
3. Click "Configurar":
   - Selecione **uma ou mais tabelas** no `TableMultiSelect`
   - Edite a matriz de visibilidade, valores, bypass do criador e janela temporal
   - Salvar aplica a **mesma config em todas as tabelas selecionadas** via
     endpoint `PATCH /extensions/:id/bulk-table-settings` (com optimistic lock)
4. Tabelas já configuradas aparecem como badges no card — click pra editar
   individualmente

## Comportamento por operação

Para um usuário **não-admin** numa tabela com config completa
(visibility on, creator on, date sliding 30d):

| Operação | Própria row | Row alheia (visibility permitida) | Row alheia (visibility proibida) | Row antiga (>30d) |
|----------|-------------|-----------------------------------|----------------------------------|-------------------|
| Listar | ✓ (via $or creator) | ✓ | ✗ (filtrada) | ✗ (filtrada) |
| GET por ID | 200 ✓ | 200 ✓ | 403 ROW_ACCESS_DENIED | 403 ROW_ACCESS_DENIED |
| Criar com valor permitido | 201 ✓ | n/a | n/a | n/a |
| Criar com valor proibido | 403 ROW_WRITE_RESTRICTED | n/a | n/a | n/a |
| Update própria | 200 ✓ (mesmo SIGILOSA) | bloqueado por canRead | bloqueado | bloqueado |
| Update alheia tentando proibir valor | n/a | 403 ROW_WRITE_RESTRICTED | n/a | n/a |
| Delete própria | 200 ✓ | bloqueado | bloqueado | bloqueado |

## Performance

`adjustListQuery` produz queries da forma:
```
{ $or: [
    { $and: [
      { visibility: { $in: [valores permitidos pro role] } },
      { createdAt: { $gte: <data> } }
    ] },
    { creator: <userId> }
  ]
}
```

**Índices recomendados** (criar manualmente ou via migration):
- `{ visibility: 1 }` (sempre)
- `{ creator: 1 }` (quando creator-bypass on)
- `{ createdAt: 1 }` (modes createdAt-*)
- `{ validFromSlug: 1, validUntilSlug: 1 }` (mode field-range)

## Arquitetura

- **Manifest:** `manifest.json` declara `placement.kind: "row-access-guard"`
- **Implementação:** `guard.ts` exporta `RowAccessGuard` que implementa
  `RowAccessGuard` (em `backend/application/core/extensions/row-access-guard.contract.ts`)
- **Categoria:** `restrictive` (mas o fragmento inclui `$or` interno pro creator-bypass)
- **Settings schema:** `settings-schema.ts` exporta `rowAccessSettingsSchema` (Zod)
- **Registro:** `RowAccessGuardService.register('core:row-access', RowAccessGuard)`
- **DI:** `injectRowAccessGuardDeps({...})` chamado em `bin/server.ts`

## Migration

Bindings dos 3 plugins antigos (`visibility-by-role`, `creator-bypass`,
`date-window-guard`) são convertidos automaticamente no boot via
`backend/database/migrations/migrate-consolidate-row-access.ts`. Idempotente.

## Limitações

- `supportsScopeAll: false` — sempre exige seleção explícita de tabelas (precisa
  de settings por tabela)
- Máximo de **8 valores de visibility** por tabela (mantém matriz legível)
- Os 4 roles do core são fixos: `MASTER, ADMINISTRATOR, MANAGER, REGISTERED`
