import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  Controller,
  DELETE,
  getInstanceByToken,
  POST,
  PUT,
} from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import {
  ForumMessageCreateSchema,
  ForumMessageDeleteSchema,
  ForumMessageMentionReadSchema,
  ForumMessageUpdateSchema,
} from './forum-message.schema';
import ForumMessageUseCase from './forum-message.use-case';
import {
  ForumMessageCreateBodyValidator,
  ForumMessageParamsValidator,
  ForumMessageRowParamsValidator,
  ForumMessageUpdateBodyValidator,
} from './forum-message.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: ForumMessageUseCase = getInstanceByToken(
      ForumMessageUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows/:_id/forum/messages',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: ForumMessageCreateSchema,
    },
  })
  async create(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ForumMessageCreateBodyValidator.parse(request.body);
    const params = ForumMessageRowParamsValidator.parse(request.params);

    const result = await this.useCase.create({
      ...body,
      ...params,
      user: request.user.sub,
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }

  @PUT({
    url: '/:slug/rows/:_id/forum/messages/:messageId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: ForumMessageUpdateSchema,
    },
  })
  async update(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ForumMessageUpdateBodyValidator.parse(request.body);
    const params = ForumMessageParamsValidator.parse(request.params);

    const result = await this.useCase.update({
      ...body,
      ...params,
      user: request.user.sub,
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }

  @DELETE({
    url: '/:slug/rows/:_id/forum/messages/:messageId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: ForumMessageDeleteSchema,
    },
  })
  async remove(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = ForumMessageParamsValidator.parse(request.params);

    const result = await this.useCase.remove({
      ...params,
      user: request.user.sub,
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }

  @PUT({
    url: '/:slug/rows/:_id/forum/messages/:messageId/mention-read',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: ForumMessageMentionReadSchema,
    },
  })
  async mentionRead(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = ForumMessageParamsValidator.parse(request.params);

    const result = await this.useCase.markMentionRead({
      ...params,
      user: request.user.sub,
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }
}
