import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, PUT, getInstanceByToken } from 'fastify-decorators';

import {
  E_EXTENSION_TYPE,
  E_TABLE_PERMISSION,
} from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UpdateConditionalFieldsConfigValidator } from './_shared.validator';
import {
  GetConditionalFieldsConfigSchema,
  GetConditionalFieldsRuntimeConfigSchema,
  UpdateConditionalFieldsConfigSchema,
} from './conditional-fields.schema';
import GetConditionalFieldsConfigUseCase from './get-config.use-case';
import UpdateConditionalFieldsConfigUseCase from './update-config.use-case';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'forms',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId: 'conditional-fields',
});

type RequestWithTable = FastifyRequest<{
  Params: { slug: string };
}>;

@Controller({ route: '/plugins/conditional-fields' })
export default class ConditionalFieldsController {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly getConfigUseCase: GetConditionalFieldsConfigUseCase = getInstanceByToken(
      GetConditionalFieldsConfigUseCase,
    ),
    private readonly updateConfigUseCase: UpdateConditionalFieldsConfigUseCase = getInstanceByToken(
      UpdateConditionalFieldsConfigUseCase,
    ),
  ) {}

  @GET({
    url: '/tables/:slug/runtime',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: true }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: GetConditionalFieldsRuntimeConfigSchema,
    },
  })
  async getRuntimeConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.getConfigUseCase.execute(request.table!);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @GET({
    url: '/tables/:slug/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_TABLE,
        }),
        EXTENSION_GUARD,
      ],
      schema: GetConditionalFieldsConfigSchema,
    },
  })
  async getConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.getConfigUseCase.execute(request.table!);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @PUT({
    url: '/tables/:slug/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_TABLE,
        }),
        EXTENSION_GUARD,
      ],
      schema: UpdateConditionalFieldsConfigSchema,
    },
  })
  async updateConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const body = UpdateConditionalFieldsConfigValidator.parse(request.body);
    const result = await this.updateConfigUseCase.execute({
      table: request.table!,
      rules: body.rules,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
