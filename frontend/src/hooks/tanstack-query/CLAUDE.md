# TanStack Query Hooks

Hooks de API organizados por recurso, usando TanStack Query para queries e
mutations.

## Arquivos de infraestrutura

| Arquivo             | Descricao                                         |
| ------------------- | ------------------------------------------------- |
| `_query-keys.ts`    | Factory hierarquica de query keys por recurso     |
| `_query-options.ts` | `queryOptions` reutilizaveis para loaders e hooks |

## Hooks por recurso

### Authentication

| Arquivo                                 | Operacao                         |
| --------------------------------------- | -------------------------------- |
| `use-authentication-sign-in.tsx`        | Login                            |
| `use-authentication-sign-out.tsx`       | Logout                           |
| `use-authentication-sign-up.tsx`        | Registro                         |
| `use-authentication-request-code.tsx`   | Solicitar codigo (esqueci senha) |
| `use-authentication-validate-code.tsx`  | Validar codigo recebido          |
| `use-authentication-reset-password.tsx` | Redefinir senha                  |

### Setup

| Arquivo                        | Operacao                              |
| ------------------------------ | ------------------------------------- |
| `use-setup-status.tsx`         | Status do wizard de setup inicial     |
| `use-setup-submit-admin.tsx`   | Submeter dados do admin master        |
| `use-setup-submit-name.tsx`    | Submeter nome/descricao do sistema    |
| `use-setup-submit-logos.tsx`   | Submeter logos                        |
| `use-setup-submit-upload.tsx`  | Upload de arquivos do setup           |
| `use-setup-submit-email.tsx`   | Submeter config de SMTP/email         |
| `use-setup-submit-storage.tsx` | Submeter config de storage (S3/local) |
| `use-setup-submit-paging.tsx`  | Submeter config de paginacao          |

### Tables

| Arquivo                                  | Operacao                           |
| ---------------------------------------- | ---------------------------------- |
| `use-table-create.tsx`                   | Criar tabela                       |
| `use-table-read.tsx`                     | Ler tabela por slug + listar todas |
| `use-tables-read-paginated.tsx`          | Listar tabelas paginado            |
| `use-tables-read-paginated-infinite.tsx` | Listar tabelas (infinite query)    |
| `use-table-update.tsx`                   | Atualizar tabela                   |
| `use-clone-table.tsx`                    | Clonar tabela                      |
| `use-tables-export-csv.tsx`              | Exportar tabelas em CSV            |

### Fields

| Arquivo                | Operacao    |
| ---------------------- | ----------- |
| `use-field-create.tsx` | Criar campo |
| `use-field-read.tsx`   | Ler campo   |

### Rows

| Arquivo                                             | Operacao                           |
| --------------------------------------------------- | ---------------------------------- |
| `use-table-row-create.tsx`                          | Criar registro                     |
| `use-table-row-read.tsx`                            | Ler registro                       |
| `use-table-row-read-paginated.tsx`                  | Listar registros paginado          |
| `use-table-row-update.tsx`                          | Atualizar registro                 |
| `use-table-row-auto-save.tsx`                       | Auto-save de registro (rascunho)   |
| `use-table-row-delete.tsx`                          | Excluir registro (hard delete)     |
| `use-table-rows-bulk-update.tsx`                    | Atualizar registros em lote        |
| `use-table-rows-export-csv.tsx`                     | Exportar registros em CSV          |
| `use-table-rows-import-csv.tsx`                     | Importar registros de CSV          |
| `use-row-update-evaluation.tsx`                     | Atualizar avaliacao de registro    |
| `use-row-update-reaction.tsx`                       | Atualizar reacao de registro       |
| `use-row-update-restore.tsx`                        | Restaurar registro da lixeira      |
| `use-row-update-trash.tsx`                          | Mover registro para lixeira        |
| `use-relationship-rows-read-paginated.tsx`          | Listar registros de relacionamento |
| `use-relationship-rows-read-paginated-infinite.tsx` | Listar relacionamento (infinite)   |

### Relationship Links

| Arquivo                              | Operacao                          |
| ------------------------------------ | --------------------------------- |
| `use-relationship-links-list.tsx`    | Listar vinculos de relacionamento |
| `use-relationship-link-create.tsx`   | Criar vinculo                     |
| `use-relationship-link-delete.tsx`   | Remover vinculo                   |
| `use-relationship-links-reorder.tsx` | Reordenar vinculos                |

### Groups

| Arquivo                           | Operacao                          |
| --------------------------------- | --------------------------------- |
| `use-group-create.tsx`            | Criar grupo                       |
| `use-group-read.tsx`              | Ler grupo                         |
| `use-group-read-list.tsx`         | Listar todos os grupos            |
| `use-group-read-paginated.tsx`    | Listar grupos paginado            |
| `use-group-update.tsx`            | Atualizar grupo                   |
| `use-group-delete.tsx`            | Excluir grupo (hard delete)       |
| `use-group-send-to-trash.tsx`     | Mover grupo para lixeira          |
| `use-group-remove-from-trash.tsx` | Restaurar grupo da lixeira        |
| `use-group-empty-trash.tsx`       | Esvaziar lixeira de grupos        |
| `use-group-bulk-trash.tsx`        | Enviar grupos para lixeira (lote) |
| `use-group-bulk-restore.tsx`      | Restaurar grupos (lote)           |
| `use-group-bulk-delete.tsx`       | Excluir grupos (lote)             |
| `use-groups-export-csv.tsx`       | Exportar grupos em CSV            |
| `use-group-field-create.tsx`      | Criar campo de grupo              |
| `use-group-field-update.tsx`      | Atualizar campo de grupo          |
| `use-group-row-create.tsx`        | Criar registro de grupo           |
| `use-group-row-update.tsx`        | Atualizar registro de grupo       |
| `use-group-row-delete.tsx`        | Excluir registro de grupo         |
| `use-group-row-auto-save.tsx`     | Auto-save de registro de grupo    |
| `use-group-rows-export-csv.tsx`   | Exportar registros de grupo CSV   |

### Menus

| Arquivo                       | Operacao                         |
| ----------------------------- | -------------------------------- |
| `use-menu-create.tsx`         | Criar menu                       |
| `use-menu-read.tsx`           | Ler menu                         |
| `use-menu-read-list.tsx`      | Listar todos os menus            |
| `use-menu-read-paginated.tsx` | Listar menus paginado            |
| `use-menu-update.tsx`         | Atualizar menu                   |
| `use-menu-dynamic.tsx`        | Menu dinamico (tools + estatico) |
| `use-menu-reorder.tsx`        | Reordenar menus                  |
| `use-menu-bulk-trash.tsx`     | Enviar menus para lixeira (lote) |
| `use-menu-bulk-restore.tsx`   | Restaurar menus (lote)           |
| `use-menu-bulk-delete.tsx`    | Excluir menus (lote)             |
| `use-menu-empty-trash.tsx`    | Esvaziar lixeira de menus        |
| `use-menus-export-csv.tsx`    | Exportar menus em CSV            |

### Users

| Arquivo                                | Operacao                            |
| -------------------------------------- | ----------------------------------- |
| `use-user-create.tsx`                  | Criar usuario                       |
| `use-user-read.tsx`                    | Ler usuario                         |
| `use-user-read-paginated.tsx`          | Listar usuarios paginado            |
| `use-user-read-paginated-infinite.tsx` | Listar usuarios (infinite)          |
| `use-user-update.tsx`                  | Atualizar usuario                   |
| `use-user-bulk-update.tsx`             | Atualizar usuarios em lote (status) |
| `use-user-delete.tsx`                  | Excluir usuario (hard delete)       |
| `use-user-send-to-trash.tsx`           | Mover usuario para lixeira          |
| `use-user-remove-from-trash.tsx`       | Restaurar usuario da lixeira        |
| `use-user-empty-trash.tsx`             | Esvaziar lixeira de usuarios        |
| `use-user-bulk-trash.tsx`              | Enviar usuarios para lixeira (lote) |
| `use-user-bulk-restore.tsx`            | Restaurar usuarios (lote)           |
| `use-user-bulk-delete.tsx`             | Excluir usuarios (lote)             |
| `use-users-export-csv.tsx`             | Exportar usuarios em CSV            |

### Notifications

| Arquivo                                 | Operacao                     |
| --------------------------------------- | ---------------------------- |
| `use-notification-paginated.tsx`        | Listar notificacoes paginado |
| `use-notification-unread-count.tsx`     | Contagem de nao-lidas        |
| `use-notification-mark-as-read.tsx`     | Marcar como lida             |
| `use-notification-mark-all-as-read.tsx` | Marcar todas como lidas      |
| `use-notification-delete.tsx`           | Excluir notificacao          |

### Extensions

| Arquivo                                           | Operacao                                 |
| ------------------------------------------------- | ---------------------------------------- |
| `use-extensions-read-list.tsx`                    | Listar extensoes registradas             |
| `use-extensions-active-list.tsx`                  | Listar extensoes ativas                  |
| `use-extension-toggle.tsx`                        | Ativar/desativar extensao                |
| `use-extension-configure-table-scope.tsx`         | Configurar escopo de tabela de um plugin |
| `use-extension-bulk-configure-table-settings.tsx` | Configurar settings de tabela em lote    |

### Storage Migration

| Arquivo                             | Operacao                    |
| ----------------------------------- | --------------------------- |
| `use-storage-migration-start.tsx`   | Iniciar migracao de storage |
| `use-storage-migration-status.tsx`  | Status da migracao          |
| `use-storage-migration-cleanup.tsx` | Limpar apos migracao        |

### Logs

| Arquivo                            | Operacao                          |
| ---------------------------------- | --------------------------------- |
| `use-error-log-read-paginated.tsx` | Listar error logs paginado        |
| `use-error-log-resolve.tsx`        | Resolver error log                |
| `use-logger-read-paginated.tsx`    | Listar logs de auditoria paginado |

### Doc Transcription (tool)

| Arquivo                                   | Operacao                               |
| ----------------------------------------- | -------------------------------------- |
| `use-doc-transcription-config.tsx`        | Ler config de transcricao de documento |
| `use-doc-transcription-config-update.tsx` | Atualizar config                       |
| `use-doc-transcription-transcribe.tsx`    | Executar transcricao                   |

### Plugins (runtime)

| Arquivo                                     | Operacao                                    |
| ------------------------------------------- | ------------------------------------------- |
| `use-cascade-dropdown.tsx`                  | Dados do plugin cascade-dropdown            |
| `use-conditional-fields-runtime-config.tsx` | Config runtime do plugin conditional-fields |

### Profile

| Arquivo                  | Operacao                     |
| ------------------------ | ---------------------------- |
| `use-profile-read.tsx`   | Ler perfil do usuario logado |
| `use-profile-update.tsx` | Atualizar perfil             |

### Settings

| Arquivo                  | Operacao                |
| ------------------------ | ----------------------- |
| `use-setting-read.tsx`   | Ler configuracoes       |
| `use-setting-update.tsx` | Atualizar configuracoes |

### Permissions

| Arquivo                   | Operacao          |
| ------------------------- | ----------------- |
| `use-permission-read.tsx` | Listar permissoes |

### Pages

| Arquivo             | Operacao            |
| ------------------- | ------------------- |
| `use-page-read.tsx` | Ler pagina por slug |

### Tools / Import-Export

| Arquivo                 | Operacao                                       |
| ----------------------- | ---------------------------------------------- |
| `use-csv-export.tsx`    | Exportacao CSV generica (helper compartilhado) |
| `use-schema-import.tsx` | Importar schema de tabelas                     |

## Padrao de query keys (`_query-keys.ts`)

Factory hierarquica onde cada recurso tem niveis:
`all > lists/details > list(params)/detail(id)`.

```ts
queryKeys.tables.all; // ['tables']
queryKeys.tables.list({}); // ['tables', 'list', {...}]
queryKeys.tables.detail(s); // ['tables', 'detail', slug]
```

Isso permite invalidacao granular (ex: invalidar todas as listas sem afetar
detalhes).

## Padrao de query options (`_query-options.ts`)

Funcoes que retornam `queryOptions({...})` reutilizaveis tanto em hooks quanto
em loaders de rota do TanStack Router. Cada option define `queryKey`, `queryFn`,
`enabled` e `staleTime`.

## Padrao de mutation (create/update/delete)

1. Recebe props com callbacks `onSuccess` e `onError`
2. Usa `useMutation` com `mutationFn` que chama `API.post/put/delete`
3. No `onSuccess`: atualiza cache com `setQueryData` e/ou `invalidateQueries`
4. Retorna `UseMutationResult` tipado

## Padrao de leitura (read)

1. Usa `useQuery` ou `useSuspenseQuery` com options de `_query-options.ts`
2. Retorna `UseQueryResult` tipado
3. Hooks paginados recebem params com `page` e `perPage`

## Convencoes

- **Nomenclatura**: `use-{recurso}-{operacao}.tsx` (ex: `use-table-create.tsx`)
- **Prefixo `_`**: arquivos de infraestrutura compartilhada (`_query-keys.ts`,
  `_query-options.ts`)
- **Tipos**: payloads em `@/lib/payloads`, interfaces em `@/lib/interfaces`
- **API client**: todas as chamadas via `API` (axios instance) de `@/lib/api`
- **Toast**: feedback via `toast.success`/`toast.error` de `sonner`
- **Cache**: mutations atualizam cache manualmente com `setQueryData` antes de
  invalidar listas
