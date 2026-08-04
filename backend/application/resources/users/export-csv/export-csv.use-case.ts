import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IUser } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import {
  CsvExportContractService,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';
import { DateContractService } from '@application/services/date/date-contract.service';

import type { UserExportCsvPayload } from './export-csv.validator';

type Response = Either<HTTPException, Readable>;

const FIELDS: CsvField[] = [
  { label: 'ID', value: '_id' },
  { label: 'Nome', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Grupo', value: 'group' },
  { label: 'Status', value: 'status' },
  { label: 'Criado em', value: 'createdAt' },
  { label: 'Atualizado em', value: 'updatedAt' },
];

@Service()
export default class UserExportCsvUseCase {
  private toCsvRow(user: IUser): Record<string, string> {
    let groupName = '';
    if (typeof user.group === 'object' && user.group?.name) {
      groupName = user.group.name;
    }
    const createdAt = this.date.toIso(user.createdAt);
    const updatedAt = this.date.toIso(user.updatedAt);

    return {
      _id: user._id,
      name: user.name ?? '',
      email: user.email ?? '',
      group: groupName,
      status: user.status ?? '',
      createdAt,
      updatedAt,
    };
  }
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly csvExport: CsvExportContractService,
    private readonly date: DateContractService,
  ) {}

  async execute(payload: UserExportCsvPayload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-email']) sort.email = payload['order-email'];
      if (payload['order-group']) sort['group.name'] = payload['order-group'];
      if (payload['order-status']) sort.status = payload['order-status'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];

      const total = await this.userRepository.count(payload);

      const overLimit = this.csvExport.rejectWhenOverLimit(total);
      if (overLimit) return left(overLimit);

      console.info(
        `[users > export-csv] user=${payload.user?._id ?? 'unknown'} count=${total}`,
      );

      const source = this.csvExport.iterateInBatches({
        payload: { ...payload, sort },
        fetchBatch: async (p, page, perPage) => {
          const batch = await this.userRepository.findMany({
            ...p,
            page,
            perPage,
          });
          return batch.map((item) => this.toCsvRow(item));
        },
      });

      const stream = this.csvExport.buildStream({ source, fields: FIELDS });

      return right(stream);
    } catch (error) {
      const limitError = this.csvExport.toHttpException(error);
      if (limitError) return left(limitError);
      console.error('[users > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_USER_CSV_ERROR',
        ),
      );
    }
  }
}
