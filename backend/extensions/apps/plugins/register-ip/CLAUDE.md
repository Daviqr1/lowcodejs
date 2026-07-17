# register-ip (extensão `apps/plugins/register-ip`)

Plugin que grava o **IP do usuário autenticado** no campo de texto **oculto**
`ip` de um registro. Ação manual no menu de cada linha (slot
`table.row.actions`). Não toca no core — só usa repositórios/middlewares dele.

## Endpoint
`POST /plugins/register-ip/:slug/:rowId` | Auth: Sim | Permissão: UPDATE_ROW

## Fluxo
1. Middlewares (core): `AuthenticationMiddleware({ optional: false })`,
   `TableAccessMiddleware({ requiredPermission: 'UPDATE_ROW' })`,
   `ExtensionActiveMiddleware({ pkg: 'apps', type: PLUGIN, extensionId: 'register-ip' })`.
2. Controller resolve o IP real: 1º IP de `x-forwarded-for`, fallback `request.ip`.
3. Use-case (`@Service`): busca a tabela por slug, exige um campo não-nativo com
   slug `ip`, e grava o IP **direto na linha** via `RowContractRepository.update`
   — a gravação direta contorna o descarte de campo oculto do create/update do
   core (que só roda naquele caminho), então funciona com o campo oculto.

## Por que funciona com campo oculto
O `FieldVisibilityService` descarta escrita em campo oculto **dentro** do
create/update use-case do core. Este plugin escreve pelo repositório
diretamente, fora desse caminho — logo o valor não é descartado e só é visível
para dono/MASTER/admin na leitura.

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela não encontrada |
| 400 | IP_FIELD_NOT_FOUND | A tabela não tem campo de texto com slug `ip` |
| 404 | ROW_NOT_FOUND | Registro não encontrado |
| 500 | REGISTER_IP_ERROR | Erro interno |

## Setup (humano)
1. Criar na tabela um campo **TEXT_SHORT** com slug `ip` (opcional) e marcá-lo
   **oculto** (permissões list/form/detail = NINGUÉM).
2. Reiniciar o backend (re-registra o manifest).
3. Ativar o plugin em `/extensions` (MASTER) e, opcionalmente, limitar o escopo
   por tabela.

## Frontend
`frontend/extensions/apps/plugins/register-ip/index.tsx` — `DropdownMenuItem`
"Registrar IP" no slot `table.row.actions`; chama o endpoint com
`{ slug, rowId: row._id }` e mostra toast.
