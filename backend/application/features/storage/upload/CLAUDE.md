# Upload Storage

Faz upload de um ou mais arquivos para o storage.

## Endpoint
`POST /storage` | Auth: Yes | Permission: nenhuma especifica

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: StorageUploadQueryValidator - campos: staticName (string, optional, min 1) | Body: multipart files (via request.files())
3. UseCase:
   - Itera sobre os arquivos do multipart via AsyncIterableIterator
   - Para cada arquivo: faz upload via service.upload(part, staticName)
   - Cria registros em lote via storageRepository.createMany
   - Retorna array de IStorage criados
4. Repository: StorageContractRepository (createMany), StorageService (upload)

## Regras de Negocio
- Aceita multiplos arquivos em uma unica requisicao (multipart)
- O parametro staticName permite definir um nome fixo para o arquivo (sobrescreve nomes automaticos)
- Cada arquivo e salvo fisicamente via SDK e registrado no banco
- Retorna 201 com array de registros de storage criados

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 500 | STORAGE_UPLOAD_ERROR | Erro durante upload (arquivo invalido, disco cheio, etc.) |

## Testes
- Unit: `upload.use-case.spec.ts`
- E2E: `upload.controller.spec.ts`
