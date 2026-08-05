import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  Controller,
  DELETE,
  GET,
  POST,
  PUT,
  getInstanceByToken,
} from 'fastify-decorators';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  CreateChannelValidator,
  CreateEntryValidator,
  UpdateChannelValidator,
  UpdateEntryValidator,
} from './_shared.validator';
import SenhasChannelUseCase from './senhas-channel.use-case';
import SenhasEntryUseCase from './senhas-entry.use-case';
import {
  CreateChannelSchema,
  CreateEntrySchema,
  DeleteChannelSchema,
  DeleteEntrySchema,
  ListChannelsSchema,
  ListEntriesSchema,
  UpdateChannelSchema,
  UpdateEntrySchema,
} from './senhas.schema';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'apps',
  type: E_EXTENSION_TYPE.MODULE,
  extensionId: 'senhas',
});

// Qualquer usuário autenticado pode usar o módulo (gerenciar seus próprios
// cofres). O controle de acesso fino é por canal (owner/membro), nas use-cases.
const GUARDS = [AuthenticationMiddleware({ optional: false }), EXTENSION_GUARD];

type Params = { channelId: string; entryId: string };

@Controller({ route: '/e/apps/senhas' })
export default class SenhasController {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly channelUseCase: SenhasChannelUseCase = getInstanceByToken(
      SenhasChannelUseCase,
    ),
    private readonly entryUseCase: SenhasEntryUseCase = getInstanceByToken(
      SenhasEntryUseCase,
    ),
  ) {}

  @GET({
    url: '/channels',
    options: { onRequest: GUARDS, schema: ListChannelsSchema },
  })
  async listChannels(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.channelUseCase.list(request.user.sub);
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }

  @POST({
    url: '/channels',
    options: { onRequest: GUARDS, schema: CreateChannelSchema },
  })
  async createChannel(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const body = CreateChannelValidator.parse(request.body);
    const result = await this.channelUseCase.create(request.user.sub, body);
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(201).send(result.value);
  }

  @PUT({
    url: '/channels/:channelId',
    options: { onRequest: GUARDS, schema: UpdateChannelSchema },
  })
  async updateChannel(
    request: FastifyRequest<{ Params: Pick<Params, 'channelId'> }>,
    response: FastifyReply,
  ): Promise<void> {
    const body = UpdateChannelValidator.parse(request.body);
    const result = await this.channelUseCase.update(
      request.user.sub,
      request.params.channelId,
      body,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }

  @DELETE({
    url: '/channels/:channelId',
    options: { onRequest: GUARDS, schema: DeleteChannelSchema },
  })
  async deleteChannel(
    request: FastifyRequest<{ Params: Pick<Params, 'channelId'> }>,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.channelUseCase.remove(
      request.user.sub,
      request.params.channelId,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }

  @GET({
    url: '/channels/:channelId/entries',
    options: { onRequest: GUARDS, schema: ListEntriesSchema },
  })
  async listEntries(
    request: FastifyRequest<{ Params: Pick<Params, 'channelId'> }>,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.entryUseCase.list(
      request.user.sub,
      request.params.channelId,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }

  @POST({
    url: '/channels/:channelId/entries',
    options: { onRequest: GUARDS, schema: CreateEntrySchema },
  })
  async createEntry(
    request: FastifyRequest<{ Params: Pick<Params, 'channelId'> }>,
    response: FastifyReply,
  ): Promise<void> {
    const body = CreateEntryValidator.parse(request.body);
    const result = await this.entryUseCase.create(
      request.user.sub,
      request.params.channelId,
      body,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(201).send(result.value);
  }

  @PUT({
    url: '/channels/:channelId/entries/:entryId',
    options: { onRequest: GUARDS, schema: UpdateEntrySchema },
  })
  async updateEntry(
    request: FastifyRequest<{ Params: Params }>,
    response: FastifyReply,
  ): Promise<void> {
    const body = UpdateEntryValidator.parse(request.body);
    const result = await this.entryUseCase.update(
      request.user.sub,
      request.params.channelId,
      request.params.entryId,
      body,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }

  @DELETE({
    url: '/channels/:channelId/entries/:entryId',
    options: { onRequest: GUARDS, schema: DeleteEntrySchema },
  })
  async deleteEntry(
    request: FastifyRequest<{ Params: Params }>,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.entryUseCase.remove(
      request.user.sub,
      request.params.channelId,
      request.params.entryId,
    );
    if (result.isLeft()) return this.http.sendError(response, result.value);
    return response.status(200).send(result.value);
  }
}
