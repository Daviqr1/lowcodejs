import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_FIELD_TYPE, type ITable } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import { CascadeDropdownConfigContractRepository } from './cascade-dropdown-config-contract.repository';
import { CascadeDropdownQueryContractService } from './cascade-dropdown-query-contract.service';
import type { CascadeDropdownConfig } from './cascade-dropdown.types';

type Body = Omit<
  CascadeDropdownConfig,
  'targetTableSlug' | 'targetFieldId' | 'targetFieldSlug'
>;

type Payload = {
  targetTableSlug: string;
  targetFieldId: string;
  body: Body;
};

type Response = Either<HTTPException, CascadeDropdownConfig>;

/** Pai e filho so podem ser relacionamento — nao ha cascade sobre outro tipo. */
const SELECTABLE_PARENT_TYPES = new Set<string>([E_FIELD_TYPE.RELATIONSHIP]);

const FILTERABLE_TYPES = new Set<string>([
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.RELATIONSHIP,
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.DATE,
]);

@Service()
export default class SaveCascadeDropdownConfigUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly configRepository: CascadeDropdownConfigContractRepository,
    private readonly query: CascadeDropdownQueryContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const targetTable = await this.tableRepository.findBySlug(
      payload.targetTableSlug,
    );
    if (!targetTable) {
      return left(
        HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
      );
    }

    const targetField = targetTable.fields.find(
      (field) => this.query.fieldId(field) === payload.targetFieldId,
    );
    if (!targetField || targetField.trashed) {
      return left(
        HTTPException.NotFound('Campo não encontrado', 'FIELD_NOT_FOUND'),
      );
    }

    if (targetField.type !== E_FIELD_TYPE.RELATIONSHIP) {
      return left(
        HTTPException.BadRequest(
          'O campo precisa ser do tipo relacionamento',
          'FIELD_MUST_BE_RELATIONSHIP',
        ),
      );
    }

    if (!targetField.relationship?.table?.slug) {
      return left(
        HTTPException.BadRequest(
          'Relacionamento não configurado',
          'RELATIONSHIP_NOT_CONFIGURED',
        ),
      );
    }

    if (targetField.relationship.table.slug !== payload.body.sourceTableSlug) {
      return left(
        HTTPException.BadRequest(
          'A tabela fonte deve ser a tabela relacionada ao campo',
          'SOURCE_TABLE_MISMATCH',
        ),
      );
    }

    const sourceTable = await this.tableRepository.findBySlug(
      payload.body.sourceTableSlug,
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
      targetTable.fields,
      payload.body.parentFieldId,
      payload.body.parentFieldSlug,
    );
    const childField = this.query.findFieldByIdOrSlug(
      sourceTable.fields,
      payload.body.childFieldId,
      payload.body.childFieldSlug,
    );

    if (!parentField || parentField.trashed || parentField.native) {
      return left(
        HTTPException.BadRequest('Campo pai inválido', 'INVALID_PARENT_FIELD'),
      );
    }

    if (!SELECTABLE_PARENT_TYPES.has(parentField.type)) {
      return left(
        HTTPException.BadRequest(
          'Campo pai deve ser um relacionamento',
          'UNSUPPORTED_PARENT_FIELD_TYPE',
        ),
      );
    }

    if (!childField || childField.trashed || childField.native) {
      return left(
        HTTPException.BadRequest(
          'Campo de filtro inválido',
          'INVALID_CHILD_FIELD',
        ),
      );
    }

    if (!SELECTABLE_PARENT_TYPES.has(childField.type)) {
      return left(
        HTTPException.BadRequest(
          'Campo de filtro deve ser um relacionamento',
          'UNSUPPORTED_CHILD_FIELD_TYPE',
        ),
      );
    }

    const parentRelationshipTable = parentField.relationship?.table?.slug;
    const childRelationshipTable = childField.relationship?.table?.slug;
    if (
      parentRelationshipTable &&
      childRelationshipTable &&
      parentRelationshipTable !== childRelationshipTable
    ) {
      return left(
        HTTPException.BadRequest(
          'O campo pai e o campo de filtro precisam apontar para a mesma tabela',
          'CASCADE_RELATIONSHIP_MISMATCH',
        ),
      );
    }

    const invalidFilter = this.findInvalidFilter(sourceTable, payload.body);
    if (invalidFilter) return left(invalidFilter);

    const config = await this.configRepository.save({
      targetTableSlug: payload.targetTableSlug,
      targetFieldId: payload.targetFieldId,
      targetFieldSlug: targetField.slug,
      sourceTableId: payload.body.sourceTableId,
      sourceTableSlug: sourceTable.slug,
      parentFieldId: this.query.fieldId(parentField),
      parentFieldSlug: parentField.slug,
      childFieldId: this.query.fieldId(childField),
      childFieldSlug: childField.slug,
      enabled: payload.body.enabled,
      parentWidth: payload.body.parentWidth,
      childWidth: payload.body.childWidth,
      filters: payload.body.filters,
    });

    return right(config);
  }

  /** `null` quando todo filtro aponta para um campo existente e filtravel. */
  private findInvalidFilter(
    sourceTable: ITable,
    body: Body,
  ): HTTPException | null {
    for (const filter of body.filters) {
      const filterField = this.query.findFieldByIdOrSlug(
        sourceTable.fields,
        filter.fieldId,
        filter.fieldSlug,
      );

      if (!filterField || filterField.trashed || filterField.native) {
        return HTTPException.BadRequest(
          'Filtro aponta para um campo inválido',
          'INVALID_FILTER_FIELD',
        );
      }

      if (!FILTERABLE_TYPES.has(filterField.type)) {
        return HTTPException.BadRequest(
          'Tipo de campo não suportado para filtro',
          'UNSUPPORTED_FILTER_FIELD_TYPE',
        );
      }
    }

    return null;
  }
}
