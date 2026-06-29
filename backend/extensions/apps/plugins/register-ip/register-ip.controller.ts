/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import RegisterIpUseCase from './register-ip.use-case';
import { RegisterIpParamsValidator } from './register-ip.validator';

// IP real do cliente atrás de proxy: prioriza o 1º IP de `x-forwarded-for`,
// com fallback para `request.ip` (escopado a esta rota — sem mexer no kernel).
function resolveClientIp(request: FastifyRequest): string {
  const header = request.headers['x-forwarded-for'];

  let raw = '';
  if (typeof header === 'string') raw = header;
  if (Array.isArray(header) && header.length > 0) raw = header[0] ?? '';

  const first = raw.split(',')[0]?.trim();
  if (first) return first;

  return request.ip;
}

@Controller({
  route: '/plugins/register-ip',
})
export default class {
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
          requiredPermission: 'UPDATE_ROW',
        }),
        ExtensionActiveMiddleware({
          pkg: 'apps',
          type: E_EXTENSION_TYPE.PLUGIN,
          extensionId: 'register-ip',
        }),
      ],
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { slug, rowId } = RegisterIpParamsValidator.parse(request.params);
    const ip = resolveClientIp(request);

    const result = await this.useCase.execute({ slug, rowId, ip });

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
