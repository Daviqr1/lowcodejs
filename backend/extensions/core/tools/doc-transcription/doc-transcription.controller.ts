import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  Controller,
  GET,
  PATCH,
  POST,
  getInstanceByToken,
} from 'fastify-decorators';

import { E_EXTENSION_TYPE, E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  GetConfigSchema,
  TranscribeSchema,
  UpdateConfigSchema,
} from './doc-transcription.schema';
import {
  TranscribeValidator,
  UpdateConfigValidator,
} from './doc-transcription.validator';
import GetDocTranscriptionConfigUseCase from './get-config.use-case';
import TranscribeDocumentUseCase from './transcribe.use-case';
import UpdateDocTranscriptionConfigUseCase from './update-config.use-case';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'core',
  type: E_EXTENSION_TYPE.TOOL,
  extensionId: 'doc-transcription',
});

// Lê o `.value` (string) de um campo do multipart sem asserção sobre `unknown`.

@Controller({ route: '/tools' })
export default class DocTranscriptionController {
  private readMultipartFieldValue(
    fields: unknown,
    key: string,
  ): string | undefined {
    if (!fields || typeof fields !== 'object') return undefined;
    const field = Object.fromEntries(Object.entries(fields))[key];
    if (
      field &&
      typeof field === 'object' &&
      'value' in field &&
      typeof field.value === 'string'
    ) {
      return field.value;
    }
    return undefined;
  }

  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly getConfigUseCase: GetDocTranscriptionConfigUseCase = getInstanceByToken(
      GetDocTranscriptionConfigUseCase,
    ),
    private readonly updateConfigUseCase: UpdateDocTranscriptionConfigUseCase = getInstanceByToken(
      UpdateDocTranscriptionConfigUseCase,
    ),
    private readonly transcribeUseCase: TranscribeDocumentUseCase = getInstanceByToken(
      TranscribeDocumentUseCase,
    ),
  ) {}

  @GET({
    url: '/doc-transcription/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
        EXTENSION_GUARD,
      ],
      schema: GetConfigSchema,
    },
  })
  async getConfig(
    _request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.getConfigUseCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @PATCH({
    url: '/doc-transcription/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
        EXTENSION_GUARD,
      ],
      schema: UpdateConfigSchema,
    },
  })
  async updateConfig(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const body = UpdateConfigValidator.parse(request.body);
    const result = await this.updateConfigUseCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }

  @POST({
    url: '/doc-transcription/transcribe',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
        EXTENSION_GUARD,
      ],
      schema: TranscribeSchema,
    },
  })
  async transcribe(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const data = await request.file();

    if (!data) {
      return response.status(400).send({
        message: 'Arquivo não enviado',
        code: 400,
        cause: 'FILE_REQUIRED',
      });
    }

    const documentTypeId = this.readMultipartFieldValue(
      data.fields,
      'documentTypeId',
    );

    if (!documentTypeId) {
      return response.status(400).send({
        message: 'Campo documentTypeId é obrigatório',
        code: 400,
        cause: 'DOCUMENT_TYPE_ID_REQUIRED',
      });
    }

    TranscribeValidator.parse({ documentTypeId });

    const fileBuffer = await data.toBuffer();

    const result = await this.transcribeUseCase.execute({
      documentTypeId,
      fileBuffer,
      filename: data.filename,
      mimetype: data.mimetype,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
