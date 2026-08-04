import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IUser } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import {
  CsvExportContractService,
  EXPORT_CSV_LIMIT,
  ExportLimitExceededError,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';

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
    let createdAt = '';
    if (user.createdAt) createdAt = new Date(user.createdAt).toISOString();
    let updatedAt = '';
    if (user.updatedAt) updatedAt = new Date(user.updatedAt).toISOString();

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

      if (total > EXPORT_CSV_LIMIT) {
        return left(
          HTTPException.UnprocessableEntity(
            `Resultado excede o limite de ${EXPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas. Refine os filtros antes de exportar.`,
            'EXPORT_LIMIT_EXCEEDED',
          ),
        );
      }

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
      if (error instanceof ExportLimitExceededError) {
        return left(
          HTTPException.UnprocessableEntity(error.message, error.cause),
        );
      }
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
