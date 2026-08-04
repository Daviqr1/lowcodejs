import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import { ProfileShowSchema } from './show.schema';
import ProfileShowUseCase from './show.use-case';

const userMapper =
  getInstanceByToken<UserMapperContractService>(UserMapperService);

@Controller({
  route: 'profile',
})
export default class {
  constructor(
    private readonly useCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
  ) {}

  @GET({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: ProfileShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute({
      _id: request.user.sub,
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

    const { capabilities, ...user } = result.value;

    return response.status(200).send({
      ...userMapper.toResponse(user),
      capabilities,
    });
  }
}
