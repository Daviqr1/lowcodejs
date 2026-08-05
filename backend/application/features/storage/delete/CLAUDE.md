# Delete Storage

Remove um arquivo do storage (banco + arquivo fisico).

## Endpoint
`DELETE /storage/:_id` | Auth: Yes | Permission: nenhuma especifica

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: StorageDeleteParamsValidator - campos: _id (string, required, min 1)
3. UseCase:
   - Remove o registro do banco via storageRepository.delete(_id)
   - Se nao encontrou, retorna 404
   - Remove o arquivo fisico via service.delete(storage.filename)
   - Retorna null
4. Repository: StorageContractRepository (delete), StorageService (delete)

## Regras de Negocio
- Remove tanto o registro no banco quanto o arquivo fisico no storage
- storageRepository.delete retorna o documento removido (ou null se nao encontrado)
- A resposta inclui message "File deleted successfully" e deletedAt timestamp

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | STORAGE_NOT_FOUND | Registro de storage nao encontrado no banco |
| 500 | STORAGE_DELETE_ERROR | Erro interno (falha ao remover arquivo fisico, etc.) |

## Testes
- Unit: `delete.use-case.spec.ts`
- E2E: `delete.controller.spec.ts`
