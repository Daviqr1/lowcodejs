# Chat

Upload de arquivos para o chat via Socket.IO. Processa imagens e PDFs.

## Configuracao IA

O handler `chat.socket.ts` le `AI_ASSISTANT_ENABLED` e `OPENAI_API_KEY`
diretamente do documento Setting (MongoDB) em cada conexao. A UI `/settings`
e a unica fonte — alterar nao requer reboot do servidor. `MCP_SERVER_URL`
permanece como env (`.env`) por ser endpoint de infraestrutura.

## Permissao de acesso

Alem do toggle global `AI_ASSISTANT_ENABLED`, a conexao do socket exige a
capacidade de area `MANAGE_CHAT` (`E_AREA_CAPABILITY`), resolvida pelo fecho de
grupos do usuario (`GroupResolverContractService`). MASTER bypassa. Sem a
capacidade, o socket emite `error` e desconecta. Os seeders concedem
`MANAGE_CHAT` a todos os 4 grupos de sistema por padrao (revogavel por grupo).

## Arquivos

- `chat.upload.controller.ts` - Controller de upload HTTP
- `chat.socket.ts` - Logica de WebSocket (Socket.IO)
- `system-prompt.ts` - Prompt do sistema para IA

## Endpoint de Upload

`POST /chat/upload` | Auth: Yes | Permission: nenhuma especifica

### Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: nenhum (validacao inline no controller)
3. Controller:
   - Recebe um arquivo via request.file() (multipart, arquivo unico)
   - Valida tipo: imagens (PNG, JPG, GIF, WebP) ou PDF
   - Valida tamanho: maximo 20 MB
   - Se imagem: converte para base64 data URI, retorna { type: "image", filename, content_type, data_uri }
   - Se PDF: extrai texto via pdf-parse, retorna { type: "pdf", filename, page_count, extracted_text }
4. Repository: nenhum (processamento in-memory)

### Regras de Negocio
- Aceita somente 1 arquivo por requisicao
- Tipos aceitos: image/png, image/jpeg, image/gif, image/webp, application/pdf
- Tamanho maximo: 20 MB
- Imagens sao convertidas para base64 data URI (nao salvas no storage)
- PDFs tem texto extraido via pdf-parse
- Nao ha use-case separado: logica esta diretamente no controller
- Os dados retornados sao usados pelo cliente para enviar via Socket.IO

### Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | Nenhum arquivo enviado | request.file() retorna null |
| 400 | Tipo nao suportado | Mimetype nao e imagem nem PDF |
| 400 | Arquivo muito grande | Tamanho excede 20 MB |
| 400 | Erro ao processar PDF | Falha na extracao de texto do PDF |

### Testes
- Unit: nao existe
- E2E: nao existe
