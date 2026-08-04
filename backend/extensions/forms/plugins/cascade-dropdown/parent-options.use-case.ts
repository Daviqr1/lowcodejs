import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { CascadeDropdownQueryContractService } from './cascade-dropdown-query-contract.service';
import type { CascadeDropdownOption } from './cascade-dropdown.types';

type Payload = {
  sourceTableSlug: string;
  targetTableSlug: string;
  targetFieldId: string;
  search?: string;
};

type Response = Either<HTTPException, CascadeDropdownOption[]>;

@Service()
export default class CascadeDropdownParentOptionsUseCase {
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
    if (!config || !config.enabled) return right([]);

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

    const parentField = this.query.findFieldByIdOrSlug(
      sourceTable.fields,
      config.parentFieldId,
      config.parentFieldSlug,
    );
    if (!parentField) return right([]);

    const model = await this.query.getModel(sourceTable);
    const rawValues = await model.distinct(
      parentField.slug,
      this.query.buildQueryFromConfig(sourceTable, config),
    );

    const seen = new Set<string>();
    const values: string[] = [];
    for (const rawValue of rawValues) {
      for (const value of this.query.toValueArray(rawValue)) {
        if (seen.has(value)) continue;
        seen.add(value);
        values.push(value);
      }
    }

    let relationshipLabels = new Map<string, string>();
    if (parentField.type === E_FIELD_TYPE.RELATIONSHIP) {
      relationshipLabels = await this.query.getRelationshipOptionLabels(
        parentField,
        values,
      );
    }

    const options: CascadeDropdownOption[] = [];
    for (const value of values) {
      const label =
        relationshipLabels.get(value) ??
        this.query.getConfiguredOptionLabel(parentField, value);
      if (
        payload.search &&
        !label.toLowerCase().includes(payload.search.toLowerCase())
      ) {
        continue;
      }
      options.push({ value, label });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    return right(options);
  }
}
