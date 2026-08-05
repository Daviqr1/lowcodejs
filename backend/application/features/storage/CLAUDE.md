# Storage

Upload e exclusao de arquivos. Usa AWS SDK (S3) + fs nativo (local).

## Base Route

`/storage`

## Operacoes

| Operacao | Metodo | Rota | Auth |
|----------|--------|------|------|
| upload | POST | `/storage` | Obrigatorio |
| delete | DELETE | `/storage/:_id` | Obrigatorio |

## Repositorios e Servicos Utilizados

- `StorageContractRepository` - CRUD de registros de storage no banco
- `StorageService` - upload/delete fisico de arquivos (local ou S3)

## Comportamento Chave

- Upload aceita multipart files (multiplos arquivos por requisicao)
- Cada arquivo e salvo no disco/S3 via SDK S3/fs e registrado no banco
- Delete remove o registro do banco E o arquivo fisico
- Query param `staticName` permite definir nome fixo para o arquivo
- A operacao de "update" na pasta update/ e na verdade o upload (POST /storage)
