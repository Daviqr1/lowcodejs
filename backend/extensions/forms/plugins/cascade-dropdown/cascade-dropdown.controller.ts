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

import {
  CascadeDropdownChildOptionsSchema,
  CascadeDropdownGetConfigSchema,
  CascadeDropdownParentOptionsSchema,
  CascadeDropdownSaveConfigSchema,
} from './cascade-dropdown.schema';
import {
  CascadeDropdownChildOptionsQueryValidator,
  CascadeDropdownConfigBodyValidator,
  CascadeDropdownOptionsParamsValidator,
  CascadeDropdownParamsValidator,
  CascadeDropdownParentOptionsQueryValidator,
} from './cascade-dropdown.validator';
import CascadeDropdownChildOptionsUseCase from './child-options.use-case';
import GetCascadeDropdownConfigUseCase from './get-config.use-case';
import CascadeDropdownParentOptionsUseCase from './parent-options.use-case';
import SaveCascadeDropdownConfigUseCase from './save-config.use-case';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'forms',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId: 'cascade-dropdown',
});

@Controller({ route: '/plugins/cascade-dropdown' })
export default class CascadeDropdownController {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly getConfigUseCase: GetCascadeDropdownConfigUseCase = getInstanceByToken(
      GetCascadeDropdownConfigUseCase,
    ),
    private readonly saveConfigUseCase: SaveCascadeDropdownConfigUseCase = getInstanceByToken(
      SaveCascadeDropdownConfigUseCase,
    ),
    private readonly parentOptionsUseCase: CascadeDropdownParentOptionsUseCase = getInstanceByToken(
      CascadeDropdownParentOptionsUseCase,
    ),
    private readonly childOptionsUseCase: CascadeDropdownChildOptionsUseCase = getInstanceByToken(
      CascadeDropdownChildOptionsUseCase,
    ),
  ) {}

  @GET({
    url: '/tables/:slug/fields/:fieldId/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_FIELD,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownGetConfigSchema,
    },
  })
  async getConfig(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownParamsValidator.parse(request.params);
    const result = await this.getConfigUseCase.execute({
      targetTableSlug: params.slug,
      targetFieldId: params.fieldId,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @PUT({
    url: '/tables/:slug/fields/:fieldId/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownSaveConfigSchema,
    },
  })
  async saveConfig(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownParamsValidator.parse(request.params);
    const body = CascadeDropdownConfigBodyValidator.parse(request.body);

    const result = await this.saveConfigUseCase.execute({
      targetTableSlug: params.slug,
      targetFieldId: params.fieldId,
      body,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @GET({
    url: '/source/:slug/target/:targetTableSlug/fields/:fieldId/parent-options',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownParentOptionsSchema,
    },
  })
  async parentOptions(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownOptionsParamsValidator.parse(request.params);
    const query = CascadeDropdownParentOptionsQueryValidator.parse(
      request.query,
    );

    const result = await this.parentOptionsUseCase.execute({
      sourceTableSlug: params.slug,
      targetTableSlug: params.targetTableSlug,
      targetFieldId: params.fieldId,
      search: query.search,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @GET({
    url: '/source/:slug/target/:targetTableSlug/fields/:fieldId/child-options',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownChildOptionsSchema,
    },
  })
  async childOptions(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownOptionsParamsValidator.parse(request.params);
    const query = CascadeDropdownChildOptionsQueryValidator.parse(
      request.query,
    );

    const result = await this.childOptionsUseCase.execute({
      sourceTableSlug: params.slug,
      targetTableSlug: params.targetTableSlug,
      targetFieldId: params.fieldId,
      page: query.page,
      perPage: query.perPage,
      parentValue: query.parentValue,
      search: query.search,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
