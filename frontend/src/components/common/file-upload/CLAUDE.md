# File Upload

Componentes de upload de arquivos com preview, progresso, integracao com API de
storage e contexto global de estado de upload.

## Arquivos

| Arquivo                        | Descricao                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `index.ts`                     | Barrel de exports do modulo                                                                                  |
| `file-upload.tsx`              | Componente base FileUpload com drag-and-drop zone, lista de arquivos, preview, progresso e validacao         |
| `file-upload-with-storage.tsx` | Wrapper que integra FileUpload com API de storage (upload via POST /storage, delete via DELETE /storage/:id) |
| `uploading-context.tsx`        | Context provider para rastrear uploads ativos globalmente (registerUpload/unregisterUpload)                  |
| `attachment-context-menu.tsx`  | Menu de contexto (botao direito) sobre anexos: abrir em nova aba, salvar arquivo e copiar link               |

## Dependencias principais

- `@tanstack/react-query` (useMutation) para upload e delete de arquivos
- `@/lib/api` (API) para chamadas HTTP ao backend
- Tipo `IStorage` de `@/lib/interfaces` para representar arquivos no storage

## Padroes importantes

- `FileUploadWithStorage` simula progresso incremental durante upload real (ate
  80%, completa para 100% no sucesso)
- Deduplicacao de storages via Map por `_id` para evitar duplicatas
- `useUploadingContext` permite que qualquer componente filho saiba se ha
  uploads em andamento
- `useIsUploading` retorna boolean simples para desabilitar botoes durante
  upload
- `onStorageChange` e chamado via `queueMicrotask` para evitar setState durante
  render
- Suporte a `initialStorages` para recarregar arquivos ja salvos (ex: edicao de
  formulario)
- `shouldDeleteFromStorage` controla se o arquivo e deletado do storage ao
  remover (default: true)
- Modo `compact` renderiza botao de paperclip pequeno em vez de dropzone
  completa
