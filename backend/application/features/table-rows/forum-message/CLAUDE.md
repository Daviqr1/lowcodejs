# Forum Message

Gerencia mensagens de forum em tabelas com estilo FORUM. Suporta criar, editar, excluir mensagens e marcar mencoes como lidas.

## Endpoints
- `POST /tables/:slug/rows/:_id/forum/messages` | Auth: Sim | Permission: VIEW_ROW (criar mensagem)
- `PUT /tables/:slug/rows/:_id/forum/messages/:messageId` | Auth: Sim | Permission: VIEW_ROW (editar mensagem)
- `DELETE /tables/:slug/rows/:_id/forum/messages/:messageId` | Auth: Sim | Permission: VIEW_ROW (excluir mensagem)
- `PUT /tables/:slug/rows/:_id/forum/messages/:messageId/mention-read` | Auth: Sim | Permission: VIEW_ROW (marcar mencao como lida)

## Fluxo

### Create
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (VIEW_ROW)
2. Validator: ForumMessageCreateBodyValidator - campos: text (string optional), attachments (array string optional), mentions (array string optional), replyTo (string nullable optional). ForumMessageRowParamsValidator - campos: slug, _id
3. UseCase:
   - Valida tabela existe e style=FORUM
   - Resolve configuracao do forum (resolveForumConfig) mapeando campos do grupo mensagens
   - Verifica acesso ao canal (creator ou membro em canais privados)
   - Valida que mensagem tem conteudo (text ou attachments)
   - Resolve emails dos mencionados e envia notificacao por email
   - Cria mensagem com UUID, texto, autor, data, anexos, mencoes, resposta, reacoes
   - Persiste via $set no array de mensagens e retorna row atualizada

### Update
1. Mesmos middlewares e validators base + ForumMessageParamsValidator (inclui messageId)
2. UseCase:
   - Mesmas validacoes de tabela, forum e acesso
   - Busca mensagem pelo messageId no array
   - Valida que usuario e o autor da mensagem
   - Atualiza text, attachments, mentions, replyTo
   - Envia notificacao apenas para novos mencionados (nao re-notifica)
   - Persiste e retorna row atualizada

### Delete
1. Mesmos middlewares + ForumMessageParamsValidator
2. UseCase:
   - Mesmas validacoes de tabela, forum e acesso
   - Busca mensagem pelo messageId
   - Valida que usuario e o autor
   - Remove mensagem do array via splice
   - Persiste e retorna row atualizada

### Mark Mention Read
1. Mesmos middlewares + ForumMessageParamsValidator
2. UseCase:
   - Mesmas validacoes de tabela, forum e acesso
   - Valida que campo messageMentionSeenSlug existe no template
   - Valida que usuario foi mencionado na mensagem
   - Adiciona userId ao array de seen se ainda nao esta
   - Persiste e retorna row atualizada

## Repositorios
- TableContractRepository.findBy
- UserContractRepository.findMany (resolucao de emails para mencoes)
- EmailContractService.sendEmail (notificacao de mencoes)
- Colecao dinamica via buildTable().findOne, findOneAndUpdate

## Regras de Negocio
- Apenas tabelas com style=FORUM podem usar este endpoint
- Configuracao do forum e resolvida dinamicamente a partir dos campos do grupo "mensagens"
- Canais privados (privacidade="privado" ou tem campo membros): apenas creator ou membros podem acessar
- Apenas o autor da mensagem pode editar ou excluir
- Mensagem deve ter texto (nao-vazio apos remover HTML) ou pelo menos um anexo
- Mencoes geram notificacao por email (resiliente a falhas do email service)
- Update nao re-notifica usuarios ja notificados anteriormente

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 400 | FORUM_TABLE_REQUIRED | Tabela nao e do estilo FORUM |
| 400 | FORUM_MESSAGES_FIELD_NOT_FOUND | Campo de mensagens nao encontrado na tabela |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 403 | FORUM_CHANNEL_ACCESS_DENIED | Usuario sem acesso ao canal |
| 400 | FORUM_MESSAGE_EMPTY | Mensagem sem texto e sem anexos |
| 404 | FORUM_MESSAGE_NOT_FOUND | Mensagem nao encontrada pelo messageId |
| 403 | FORUM_MESSAGE_AUTHOR_REQUIRED | Usuario nao e o autor (edit/delete) |
| 400 | FORUM_MENTION_READ_FIELD_NOT_FOUND | Campo de mencoes lidas nao existe no template |
| 400 | FORUM_MENTION_NOT_FOUND | Usuario nao foi mencionado (mention-read) |
| 500 | FORUM_MESSAGE_CREATE_ERROR | Erro interno (create) |
| 500 | FORUM_MESSAGE_UPDATE_ERROR | Erro interno (update) |
| 500 | FORUM_MESSAGE_DELETE_ERROR | Erro interno (delete) |
| 500 | FORUM_MENTION_READ_ERROR | Erro interno (mention-read) |

## Testes
- Unit: nao possui
- E2E: nao possui
