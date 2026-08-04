import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { ResolvedTableGroup } from './table-group-contract.service';
import { TableGroupContractService } from './table-group-contract.service';

@Service()
export default class TableGroupService implements TableGroupContractService {
  constructor(private readonly tableRepository: TableContractRepository) {}

  async resolve(
    tableSlug: string,
    groupSlug: string,
  ): Promise<Either<HTTPException, ResolvedTableGroup>> {
    const table = await this.tableRepository.findBySlug(tableSlug);

    if (!table) {
      return left(
        HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
      );
    }

    const groupField = table.fields?.find(
      (field) =>
        field.type === E_FIELD_TYPE.FIELD_GROUP &&
        field.group?.slug === groupSlug,
    );

    if (!groupField) {
      return left(
        HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
      );
    }

    return right({ table, groupField });
  }
}
