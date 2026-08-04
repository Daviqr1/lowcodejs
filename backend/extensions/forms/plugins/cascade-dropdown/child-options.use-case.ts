import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMeta, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { CascadeDropdownQueryContractService } from './cascade-dropdown-query-contract.service';

type Payload = {
  sourceTableSlug: string;
  targetTableSlug: string;
  targetFieldId: string;
  page: number;
  perPage: number;
  parentValue?: string;
  search?: string;
};

type Result = {
  data: IRow[];
  meta: IMeta;
};

type Response = Either<HTTPException, Result>;

@Service()
export default class CascadeDropdownChildOptionsUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly query: CascadeDropdownQueryContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const config = await this.query.findUsableConfig(
      payload.targetTableSlug,
      payload.targetFieldId,
    );
    // Config ausente ou desligada nao e erro: o campo so nao cascateia.
    if (!config || !config.enabled) return right(this.emptyPage(payload));

    if (config.sourceTableSlug !== payload.sourceTableSlug) {
      return left(
        HTTPException.BadRequest(
          'Tabela fonte incompatível',
          'SOURCE_TABLE_MISMATCH',
        ),
      );
    }

    const sourceTable = await this.tableRepository.findBySlug(
      payload.sourceTableSlug,
    );
    if (!sourceTable) {
      return left(
        HTTPException.NotFound(
          'Tabela fonte não encontrada',
          'SOURCE_TABLE_NOT_FOUND',
        ),
      );
    }

    const childField = this.query.findFieldByIdOrSlug(
      sourceTable.fields,
      config.childFieldId,
      config.childFieldSlug,
    );

    const model = await this.query.getModel(sourceTable);
    const mongoQuery = this.query.buildQueryFromConfig(sourceTable, config, {
      parentValue: payload.parentValue,
      search: payload.search,
      childField,
    });

    const skip = (payload.page - 1) * payload.perPage;
    const [rows, total] = await Promise.all([
      model
        .find(mongoQuery)
        .skip(skip)
        .limit(payload.perPage)
        .sort({ [config.childFieldSlug]: 1 }),
      model.countDocuments(mongoQuery),
    ]);

    let lastPage = 0;
    if (total > 0) lastPage = Math.ceil(total / payload.perPage);
    let firstPage = 0;
    if (total > 0) firstPage = 1;

    return right({
      data: this.query.transformRows(rows),
      meta: {
        total,
        perPage: payload.perPage,
        page: payload.page,
        lastPage,
        firstPage,
      },
    });
  }

  private emptyPage(payload: Pick<Payload, 'page' | 'perPage'>): Result {
    return {
      data: [],
      meta: {
        total: 0,
        perPage: payload.perPage,
        page: payload.page,
        lastPage: 0,
        firstPage: 0,
      },
    };
  }
}
