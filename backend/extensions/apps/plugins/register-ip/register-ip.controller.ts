import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import {
  E_EXTENSION_TYPE,
  E_TABLE_PERMISSION,
} from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RegisterIpParamsValidator } from './_shared.validator';
import { RegisterIpSchema } from './register-ip.schema';
import RegisterIpUseCase from './register-ip.use-case';

// IP real do cliente atrás de proxy: prioriza o 1º IP de `x-forwarded-for`,
// com fallback para `request.ip` (escopado a esta rota — sem mexer no kernel).

@Controller({
  route: '/plugins/register-ip',
})
export default class {
  private resolveClientIp(request: FastifyRequest): string {
    const header = request.headers['x-forwarded-for'];

    let raw = '';
    if (typeof header === 'string') raw = header;
    if (Array.isArray(header) && header.length > 0) raw = header[0] ?? '';

    const first = raw.split(',')[0]?.trim();
    if (first) return first;

    return request.ip;
  }

  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RegisterIpUseCase = getInstanceByToken(
      RegisterIpUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/:rowId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
        ExtensionActiveMiddleware({
          pkg: 'apps',
          type: E_EXTENSION_TYPE.PLUGIN,
          extensionId: 'register-ip',
        }),
      ],
      schema: RegisterIpSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { slug, rowId } = RegisterIpParamsValidator.parse(request.params);
    const ip = this.resolveClientIp(request);

    const result = await this.useCase.execute({ slug, rowId, ip });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
