import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IRelationshipLink } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { RelationshipDefinitionContractRepository } from '@application/repositories/relationship-definition/relationship-definition-contract.repository';
import { RelationshipContractService } from '@application/services/relationship/relationship-contract.service';
import { RelationshipBuilderContractService } from '@application/services/table/relationship-builder-contract.service';

import type { RelationshipLinkRequestPayload } from '../_shared.validator';

type Response = Either<HTTPException, IRelationshipLink>;

@Service()
export default class RelationshipLinkUseCase {
  constructor(
    private readonly definitions: RelationshipDefinitionContractRepository,
    private readonly fields: FieldContractRepository,
    private readonly relationship: RelationshipContractService,
    private readonly relationshipBuilder: RelationshipBuilderContractService,
  ) {}

  async execute(payload: RelationshipLinkRequestPayload): Promise<Response> {
    try {
      const definition = await this.definitions.findById(payload.id);
      if (
        !definition ||
        !this.relationship.belongsToTable(definition, payload.slug)
      ) {
        return left(
          HTTPException.NotFound(
            'Relacionamento não encontrado',
            'RELATIONSHIP_NOT_FOUND',
          ),
        );
      }

      // 1:1/1:N: vincula escrevendo a FK na row dona; devolve link sintético.
      const isPivot = await this.relationship.isPivot(definition);
      if (!isPivot) {
        const link = await this.relationshipBuilder.linkFk(
          definition,
          payload.side,
          payload.recordId,
          payload.otherId,
        );
        return right(link);
      }

      const sourceField = await this.fields.findById(
        definition.source.field._id,
      );
      const targetField = await this.fields.findById(
        definition.target.field._id,
      );
      if (!sourceField || !targetField) {
        return left(
          HTTPException.NotFound(
            'Campo do relacionamento não encontrado',
            'RELATIONSHIP_FIELD_NOT_FOUND',
          ),
        );
      }

      // N:N (pivô): vincular pelos dois lados (§5.4) — de source fixa sourceId; de
      // target fixa targetId.
      let sourceId = payload.otherId;
      let targetId = payload.recordId;
      if (payload.side === 'source') {
        sourceId = payload.recordId;
        targetId = payload.otherId;
      }

      const result = await this.relationship.link({
        definition,
        sourceField: {
          multiple: sourceField.multiple,
          relationship: sourceField.relationship,
        },
        targetField: {
          multiple: targetField.multiple,
          relationship: targetField.relationship,
        },
        sourceId,
        targetId,
        metadata: payload.metadata ?? null,
      });

      if (result.isLeft()) return left(result.value);
      return right(result.value);
    } catch (error) {
      console.error('[relationships > link][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LINK_RELATIONSHIP_ERROR',
        ),
      );
    }
  }
}
