import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';

import { CloneTableSchema } from './clone-table.schema';
import CloneTableUseCase from './clone-table.use-case';
import { CloneTableValidator } from './clone-table.validator';

@Controller({
  route: '/tools',
})
export default class {
  constructor(
    private readonly useCase: CloneTableUseCase = getInstanceByToken(
      CloneTableUseCase,
    ),
  ) {}

  @POST({
    url: '/clone-table',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        ExtensionActiveMiddleware({
          pkg: 'core',
          type: E_EXTENSION_TYPE.TOOL,
          extensionId: 'clone-table',
        }),
      ],
      schema: CloneTableSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = CloneTableValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...body,
      ownerId: request.user.sub,
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

    const { table, fieldIdMap } = result.value;
    const tables = result.value.tables ?? [table];
    const fieldIdMaps = result.value.fieldIdMaps ?? {
      [table._id]: fieldIdMap,
    };

    return response.status(201).send({
      tableId: table._id,
      slug: table.slug,
      tables: tables.map((clonedTable) => ({
        tableId: clonedTable._id,
        slug: clonedTable.slug,
        name: clonedTable.name,
      })),
      fieldIdMap,
      fieldIdMaps,
    });
  }
}
