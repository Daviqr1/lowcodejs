import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { INotification, Paginated } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';

import type { NotificationPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<INotification>>;

@Service()
export default class NotificationPaginatedUseCase {
  constructor(private readonly repository: NotificationContractRepository) {}

  async execute(payload: NotificationPaginatedPayload): Promise<Response> {
    try {
      const result = await this.repository.paginatedByUser({
        userId: payload.userId,
        page: payload.page,
        perPage: payload.perPage,
        unreadOnly: payload.unreadOnly,
      });
      return right(result);
    } catch (error) {
      console.error('[notifications > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_NOTIFICATIONS_ERROR',
        ),
      );
    }
  }
}
