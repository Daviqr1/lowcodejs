import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table.repository';
import { CsvImportQueueContractService } from '@application/services/csv-import/csv-import-queue-contract.service';
import BullMQCsvImportQueueService from '@application/services/csv-import/csv-import-queue.service';

import { TableSlugParamsValidator } from '../_shared.validator';

import { TableRowImportCsvSchema } from './import-csv.schema';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly csvImportQueue: CsvImportQueueContractService = getInstanceByToken<CsvImportQueueContractService>(
      BullMQCsvImportQueueService,
    ),
    private readonly tableRepository: TableContractRepository = getInstanceByToken(
      TableMongooseRepository,
    ),
  ) {}

  @POST({
    url: '/:slug/rows/imports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_ROW,
        }),
      ],
      schema: TableRowImportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableSlugParamsValidator.parse(request.params);

    const file = await request.file();

    if (!file) {
      return response.status(400).send({
        message: 'Arquivo CSV é obrigatório',
        code: 400,
        cause: 'INVALID_CSV_FILE',
      });
    }

    const buffer = await file.toBuffer();
    const csvContent = buffer.toString('utf-8');

    if (!csvContent.trim()) {
      return response.status(400).send({
        message: 'Arquivo CSV está vazio',
        code: 400,
        cause: 'INVALID_CSV_FILE',
      });
    }

    const table = await this.tableRepository.findBySlug(params.slug);

    if (!table) {
      return response.status(404).send({
        message: 'Tabela não encontrada',
        code: 404,
        cause: 'TABLE_NOT_FOUND',
      });
    }

    const jobId = await this.csvImportQueue.enqueue({
      slug: params.slug,
      userId: request.user.sub,
      csvContent,
    });

    return response.status(202).send({ jobId });
  }
}
