import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import { ProfileShowSchema } from './show.schema';
import ProfileShowUseCase from './show.use-case';

@Controller({
  route: 'profile',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
    private readonly userMapper: UserMapperContractService = getInstanceByToken(
      UserMapperService,
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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const { capabilities, ...user } = result.value;

    return response.status(200).send({
      ...this.userMapper.toResponse(user),
      capabilities,
    });
  }
}
