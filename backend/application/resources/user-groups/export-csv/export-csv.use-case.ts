import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IGroup, IUser } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import {
  CsvExportContractService,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';
import { DateContractService } from '@application/services/date/date-contract.service';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type { UserGroupExportCsvPayload } from './export-csv.validator';

type Response = Either<HTTPException, Readable>;

const FIELDS: CsvField[] = [
  { label: 'ID', value: '_id' },
  { label: 'Nome', value: 'name' },
  { label: 'Slug', value: 'slug' },
  { label: 'Descrição', value: 'description' },
  { label: 'Quantidade de Permissões', value: 'permissionsCount' },
  { label: 'Criado em', value: 'createdAt' },
  { label: 'Atualizado em', value: 'updatedAt' },
];

@Service()
export default class UserGroupExportCsvUseCase {
  private toCsvRow(group: IGroup): Record<string, unknown> {
    let permissionsCount = 0;
    if (Array.isArray(group.permissions)) {
      permissionsCount = group.permissions.length;
    }
    const createdAt = this.date.toIso(group.createdAt);
    const updatedAt = this.date.toIso(group.updatedAt);

    return {
      _id: group._id,
      name: group.name ?? '',
      slug: group.slug ?? '',
      description: group.description ?? '',
      permissionsCount,
      createdAt,
      updatedAt,
    };
  }
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly csvExport: CsvExportContractService,
    private readonly date: DateContractService,
  ) {}

  async execute(payload: UserGroupExportCsvPayload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-description'])
        sort.description = payload['order-description'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];

      let actor: IUser | null = null;
      if (payload.user?._id) {
        actor = await this.userRepository.findById(payload.user._id);
      }
      const hideMaster = await this.groupResolver.shouldHideMaster(actor);

      const total = await this.userGroupRepository.count({
        search: payload.search,
        trashed: payload.trashed,
        hideMaster,
      });

      const overLimit = this.csvExport.rejectWhenOverLimit(total);
      if (overLimit) return left(overLimit);

      console.info(
        `[user-groups > export-csv] user=${payload.user?._id ?? 'unknown'} count=${total}`,
      );

      const source = this.csvExport.iterateInBatches({
        payload: { ...payload, sort, hideMaster },
        fetchBatch: async (p, page, perPage) => {
          const batch = await this.userGroupRepository.findMany({
            page,
            perPage,
            search: p.search,
            trashed: p.trashed,
            hideMaster: p.hideMaster,
            sort: p.sort,
          });
          return batch.map((item) => this.toCsvRow(item));
        },
      });

      const stream = this.csvExport.buildStream({ source, fields: FIELDS });

      return right(stream);
    } catch (error) {
      const limitError = this.csvExport.toHttpException(error);
      if (limitError) return left(limitError);
      console.error('[user-groups > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_USER_GROUP_CSV_ERROR',
        ),
      );
    }
  }
}
