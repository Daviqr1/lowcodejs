# Paginated Notifications

Lista paginada das notificacoes do usuario autenticado.

## Endpoint
`GET /notifications/paginated` | Auth: Sim | Permission: nenhuma (escopo por dono)

## Fluxo
1. Middleware: AuthenticationMiddleware (obrigatorio)
2. Validator: query `page`, `perPage`, `unreadOnly?`
3. UseCase (`NotificationPaginatedUseCase`): chama
   `repository.paginatedByUser({ userId: request.user.sub, page, perPage, unreadOnly })`
4. Repository: `NotificationContractRepository.paginatedByUser`

## Resposta
`Paginated<INotification>` — `{ data, meta }`.

## Erros
| Code | Cause | Quando |
|------|-------|--------|
| 500 | (InternalServerError) | Erro ao listar |
