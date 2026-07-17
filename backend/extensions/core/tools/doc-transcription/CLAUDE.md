# Transcrição de Documentos (extensão `core/tools/doc-transcription`)

Tool que envia documentos (CNH, comprovante de endereço, etc.) para uma **API
externa de transcrição configurável** e retorna dados estruturados conforme os
tipos de documento cadastrados. Também é um plugin do slot `table.row.create`:
no formulário de criação de registro, o operador anexa um documento e os campos
extraídos podem pré-preencher o formulário. Restrita a MASTER/ADMINISTRATOR.

## Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/tools/doc-transcription/config` | GET | Retorna a config singleton (URL/key/model + tipos de documento) |
| `/tools/doc-transcription/config` | PATCH | Atualiza a config (campos opcionais; merge parcial) |
| `/tools/doc-transcription/transcribe` | POST | Recebe `multipart/form-data` (arquivo + `documentTypeId`) e devolve os campos transcritos |

Todos blindados por `AuthenticationMiddleware` + `RoleMiddleware([MASTER,
ADMINISTRATOR])` + `ExtensionActiveMiddleware({ pkg: 'core', type: TOOL,
extensionId: 'doc-transcription' })`.

## Arquivos

- `manifest.json` — TOOL, slot `table.row.create`, submenu `documents`,
  `configRoute: /tools/core/doc-transcription`, `permissions.view`
  MASTER/ADMINISTRATOR
- `doc-transcription.controller.ts` — 3 rotas; o `transcribe` lê o arquivo via
  `request.file()` e extrai `documentTypeId` dos fields do multipart
- `doc-transcription.validator.ts` — Zod: `UpdateConfigValidator` (apiUrl URL,
  apiKey, model, documentTypes) e `TranscribeValidator` (`documentTypeId`).
  `key`/`id` validados como slug
- `doc-transcription-config.model.ts` — model Mongoose singleton (`_id:
  'singleton'`, collection `doc_transcription_config`) + helpers
  `getOrCreateConfig` / `saveConfig`
- `doc-transcription.types.ts` — `IDocTranscriptionConfig`, `IDocumentType`,
  `IDocResponseField`, `ITranscribeResult`
- `get-config.use-case.ts` — lê (ou cria) a config singleton
- `update-config.use-case.ts` — salva a config; valida unicidade de `id` dos
  tipos de documento
- `transcribe.use-case.ts` — chama a API externa e mapeia a resposta para os
  `responseFields` do tipo escolhido

## Fluxo (transcribe)

1. Controller lê o multipart, exige `documentTypeId` e o arquivo
2. UseCase carrega a config singleton; exige `apiUrl` e `apiKey` presentes
3. Resolve o `documentType` por `id` na config
4. Monta `FormData` (`document`, `documentType`, `responseFields` em JSON e,
   se houver, `model`) e faz `POST` à `apiUrl` com header `X-Api-Key`
5. Resposta esperada `{ data: {...} }` (fallback para o objeto raiz); mapeia
   cada `responseField` por `key`, preenchendo `value` ou `null`
6. Retorna `{ documentTypeId, documentTypeName, fields, raw }`

## Configuração

Singleton no Mongo (`doc_transcription_config`):

- `apiUrl` / `apiKey` / `model` — endpoint da API externa, credencial e modelo
  opcional
- `documentTypes[]` — cada tipo tem `id` (slug), `name`, `description?` e
  `responseFields[]` (`key` slug, `label`, `type`: string|date|number|boolean)

No PATCH, `apiKey`/`model` só são gravados quando vêm não-vazios (evita
sobrescrever credencial salva com string vazia vinda do form).

## Erros possíveis

| Code | Cause | Quando |
|------|-------|--------|
| 400 | FILE_REQUIRED | Arquivo não enviado no multipart |
| 400 | DOCUMENT_TYPE_ID_REQUIRED | `documentTypeId` ausente |
| 400 | API_NOT_CONFIGURED | `apiUrl` não configurada |
| 400 | API_KEY_NOT_CONFIGURED | `apiKey` não configurada |
| 400 | DOCUMENT_TYPE_NOT_FOUND | `documentTypeId` não existe na config |
| 400 | DUPLICATE_DOCUMENT_TYPE_ID | Dois tipos com o mesmo `id` no PATCH |
| 502 | TRANSCRIPTION_API_ERROR | API externa respondeu erro (detalhe propagado) |
| 502 | TRANSCRIPTION_API_UNREACHABLE | Falha de conexão com a API externa |
| 500 | TRANSCRIPTION_INTERNAL_ERROR / DOC_TRANSCRIPTION_CONFIG_ERROR | Erro interno |

## Convenções / Gotchas

- A transcrição depende de uma **API externa** que o MASTER configura — não há
  IA embutida nesta tool.
- Config é singleton (`_id: 'singleton'`); não há multi-tenant aqui.
- Sem testes dedicados no diretório.
