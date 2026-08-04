import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken, POST } from 'fastify-decorators';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';

import {
  GenerateTestDataEstimateSchema,
  GenerateTestDataSchema,
  GetTestDataStatusSchema,
} from './generate-test-data.schema';
import GenerateTestDataUseCase from './generate-test-data.use-case';
import { GenerateTestDataValidator } from './generate-test-data.validator';
import { GenerationJobRegistryContractService } from './generation-job-registry-contract.service';
import GenerationJobRegistryService from './generation-job-registry.service';

@Controller({
  route: '/tools',
})
export default class {
  constructor(
    private readonly useCase: GenerateTestDataUseCase = getInstanceByToken(
      GenerateTestDataUseCase,
    ),
  ) {}

  @POST({
    url: '/generate-test-data',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        ExtensionActiveMiddleware({
          pkg: 'core',
          type: E_EXTENSION_TYPE.TOOL,
          extensionId: 'generate-test-data',
        }),
      ],
      schema: GenerateTestDataSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = GenerateTestDataValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    // 202 Accepted — job assíncrono iniciado
    return response.status(202).send(result.value);
  }

  @POST({
    url: '/generate-test-data/estimate',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        ExtensionActiveMiddleware({
          pkg: 'core',
          type: E_EXTENSION_TYPE.TOOL,
          extensionId: 'generate-test-data',
        }),
      ],
      schema: GenerateTestDataEstimateSchema,
    },
  })
  async estimate(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const body = GenerateTestDataValidator.parse(request.body);

    const result = await this.useCase.estimate(body);

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

  @GET({
    url: '/generate-test-data/status/:jobId',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        ExtensionActiveMiddleware({
          pkg: 'core',
          type: E_EXTENSION_TYPE.TOOL,
          extensionId: 'generate-test-data',
        }),
      ],
      schema: GetTestDataStatusSchema,
    },
  })
  async getStatus(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    response: FastifyReply,
  ): Promise<void> {
    const { jobId } = request.params;
    const job = getInstanceByToken<GenerationJobRegistryContractService>(
      GenerationJobRegistryService,
    ).getJob(jobId);

    if (!job) {
      return response.status(404).send({
        message: 'Job de geração de dados não encontrado.',
        code: 404,
        cause: 'JOB_NOT_FOUND',
      });
    }

    let percentage = 0;
    if (job.total > 0) {
      percentage = Math.round((job.processed / job.total) * 100);
    }

    return response.status(200).send({
      jobId,
      status: job.status,
      processed: job.processed,
      total: job.total,
      percentage,
      error: job.error,
    });
  }
}
